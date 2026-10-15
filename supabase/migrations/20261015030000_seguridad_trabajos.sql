-- LAB-44 · Corrección de seguridad de LAB-27 (trabajos_para_mi) y LAB-29 (elegir, asignar y retirar).
--
-- 1. trabajos_para_mi: también exige perfil publicado (un profesional en revisión no ve trabajos).
-- 2. Permisos: el cliente ya no puede escribir `estado` ni `profesional_elegido_id` en `trabajos`, ni
--    `estado` en `postulaciones`. Esas transiciones van solo por funciones security definer.
--    Las políticas que quedan sin uso (postulaciones_retirar y postulaciones_resolver) se borran.
-- 3. retirar_postulacion: el profesional dueño retira su postulación mientras está 'enviada'.
-- 4. elegir_postulante: exige que el elegido siga con cuenta activa y perfil publicado.

-- ---------------------------------------------------------------------------
-- 1. trabajos_para_mi (copia de LAB-27 con el rechazo de perfil no publicado)
-- ---------------------------------------------------------------------------

create or replace function public.trabajos_para_mi(
  p_oficio public.oficio default null,
  p_solo_mis_zonas boolean default true,
  p_limite integer default 20,
  p_desde integer default 0
)
returns table (
  id uuid,
  oficio public.oficio,
  titulo text,
  descripcion text,
  urgencia public.urgencia,
  presupuesto_estimado integer,
  fotos text[],
  barrio_id smallint,
  barrio_nombre text,
  distancia_km numeric,
  cantidad_postulaciones integer,
  ya_me_postule boolean,
  created_at timestamptz,
  cliente_nombre text,
  cliente_apellido_inicial text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_oficios public.oficio[];
  v_zonas smallint[];
  v_toda_la_ciudad boolean;
  v_barrio_id smallint;
begin
  if v_uid is null
    or not privado.cuenta_activa()
    or privado.rol_actual() <> 'profesional'
    or not privado.perfil_publicado(v_uid)
  then
    return;
  end if;

  select p.oficios, p.zonas, p.toda_la_ciudad, u.barrio_id
  into v_oficios, v_zonas, v_toda_la_ciudad, v_barrio_id
  from public.perfiles_profesionales p
  join public.usuarios u on u.id = p.usuario_id
  where p.usuario_id = v_uid;

  if not found or v_oficios is null or cardinality(v_oficios) = 0 then
    return;
  end if;

  if p_oficio is not null and not (p_oficio = any(v_oficios)) then
    return;
  end if;

  return query
  with candidatos as (
    select
      t.id,
      t.oficio,
      t.titulo,
      t.descripcion,
      t.urgencia,
      t.presupuesto_estimado,
      t.fotos,
      t.barrio_id,
      bt.nombre as barrio_nombre,
      case
        when bp.centro is not null and bt.centro is not null then
          round((extensions.st_distance(bt.centro, bp.centro) / 1000)::numeric, 1)
        else null
      end as distancia_km,
      t.cantidad_postulaciones,
      exists (
        select 1 from public.postulaciones po
        where po.trabajo_id = t.id
          and po.profesional_id = v_uid
          and po.estado <> 'retirada'
      ) as ya_me_postule,
      t.created_at,
      uc.nombre as cliente_nombre,
      left(uc.apellido, 1) as cliente_apellido_inicial,
      count(*) over () as total
    from public.trabajos t
    join public.barrios bt on bt.id = t.barrio_id
    left join public.barrios bp on bp.id = v_barrio_id
    join public.usuarios uc on uc.id = t.cliente_id and uc.estado = 'activa'
    where t.estado = 'abierto'
      and t.oficio = any(v_oficios)
      and (p_oficio is null or t.oficio = p_oficio)
      and (
        not coalesce(p_solo_mis_zonas, true)
        or coalesce(v_toda_la_ciudad, false)
        or t.barrio_id = any(v_zonas)
        or (bp.centro is not null and extensions.st_dwithin(bt.centro, bp.centro, 6000))
      )
  )
  select
    c.id,
    c.oficio,
    c.titulo,
    c.descripcion,
    c.urgencia,
    c.presupuesto_estimado,
    c.fotos,
    c.barrio_id,
    c.barrio_nombre,
    c.distancia_km,
    c.cantidad_postulaciones,
    c.ya_me_postule,
    c.created_at,
    c.cliente_nombre,
    c.cliente_apellido_inicial,
    c.total
  from candidatos c
  order by
    case
      when c.urgencia = 'lo_antes_posible' and c.created_at >= (now() - interval '24 hours') then 0
      else 1
    end asc,
    c.created_at desc,
    c.distancia_km asc nulls last,
    c.id desc
  limit greatest(least(coalesce(p_limite, 20), 100), 1)
  offset greatest(coalesce(p_desde, 0), 0);
end;
$$;

revoke execute on function public.trabajos_para_mi(public.oficio, boolean, integer, integer) from public, anon;
grant execute on function public.trabajos_para_mi(public.oficio, boolean, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. elegir_postulante (copia de LAB-29 con validación del elegido)
-- ---------------------------------------------------------------------------

create or replace function public.elegir_postulante(p_postulacion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_post_id uuid;
  v_trabajo_id uuid;
  v_profesional_id uuid;
  v_post_estado public.estado_postulacion;
  v_cliente_id uuid;
  v_trabajo_estado public.estado_trabajo;
  v_filas integer;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'cliente' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_postulacion_id is null then
    raise exception 'Postulación requerida' using errcode = '22023';
  end if;

  -- Bloquear el trabajo y la postulación para evitar carreras y elecciones concurrentes
  select po.id, po.trabajo_id, po.profesional_id, po.estado, t.cliente_id, t.estado
  into v_post_id, v_trabajo_id, v_profesional_id, v_post_estado, v_cliente_id, v_trabajo_estado
  from public.postulaciones po
  join public.trabajos t on t.id = po.trabajo_id
  where po.id = p_postulacion_id
  for update of t, po;

  if not found then
    raise exception 'Postulación no encontrada' using errcode = 'P0002';
  end if;

  if v_cliente_id <> v_uid then
    raise exception 'El trabajo no te pertenece' using errcode = '42501';
  end if;

  if v_trabajo_estado <> 'abierto' then
    raise exception 'El trabajo ya no está abierto' using errcode = '22023';
  end if;

  if v_post_estado <> 'enviada' then
    raise exception 'La postulación no está en estado enviada' using errcode = '22023';
  end if;

  -- El elegido tiene que seguir con cuenta activa y perfil publicado (LAB-44).
  if not privado.usuario_activo(v_profesional_id) or not privado.perfil_publicado(v_profesional_id) then
    raise exception 'El profesional ya no está disponible para este trabajo' using errcode = '22023';
  end if;

  -- 1. Marcar postulación elegida: solo si sigue enviada (con el bloqueo, esto no debería fallar).
  update public.postulaciones
  set estado = 'elegida'
  where id = p_postulacion_id
    and estado = 'enviada';
  get diagnostics v_filas = row_count;
  if v_filas <> 1 then
    raise exception 'La postulación ya no está enviada' using errcode = '22023';
  end if;

  -- 2. Descartar las demás postulaciones activas
  update public.postulaciones
  set estado = 'descartada'
  where trabajo_id = v_trabajo_id
    and id <> p_postulacion_id
    and estado = 'enviada';

  -- 3. Actualizar trabajo a asignado con el profesional
  update public.trabajos
  set estado = 'asignado',
      profesional_elegido_id = v_profesional_id
  where id = v_trabajo_id;

  return v_profesional_id;
end;
$$;

revoke execute on function public.elegir_postulante(uuid) from public, anon;
grant execute on function public.elegir_postulante(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Permisos de escritura: el estado de trabajos y postulaciones lo cambian solo las funciones
-- ---------------------------------------------------------------------------

-- Un cliente no puede elegir, asignar ni cerrar trabajos con un update directo (LAB-44).
revoke update (estado, profesional_elegido_id) on public.trabajos from authenticated;

-- Ni el cliente ni el profesional escriben el estado de una postulación por la API:
-- elegir, descartar y retirar pasan por funciones security definer.
revoke update (estado) on public.postulaciones from authenticated;

-- Políticas que quedan sin uso con los permisos de arriba.
drop policy if exists postulaciones_retirar on public.postulaciones;
drop policy if exists postulaciones_resolver on public.postulaciones;

-- ---------------------------------------------------------------------------
-- 4. Función retirar_postulacion
-- ---------------------------------------------------------------------------

create or replace function public.retirar_postulacion(p_postulacion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profesional_id uuid;
  v_estado public.estado_postulacion;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'profesional' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_postulacion_id is null then
    raise exception 'Postulación requerida' using errcode = '22023';
  end if;

  select po.profesional_id, po.estado
  into v_profesional_id, v_estado
  from public.postulaciones po
  where po.id = p_postulacion_id
  for update;

  -- Una postulación ajena se trata igual que una inexistente: no se revela que existe.
  if not found or v_profesional_id <> v_uid then
    raise exception 'Postulación no encontrada' using errcode = 'P0002';
  end if;

  if v_estado <> 'enviada' then
    raise exception 'Solo podés retirar una postulación que sigue enviada' using errcode = '22023';
  end if;

  update public.postulaciones
  set estado = 'retirada'
  where id = p_postulacion_id;

  return true;
end;
$$;

revoke execute on function public.retirar_postulacion(uuid) from public, anon;
grant execute on function public.retirar_postulacion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Función reactivar_postulacion (LAB-44)
-- ---------------------------------------------------------------------------
-- El profesional que había retirado su postulación la vuelve a enviar en un trabajo que sigue abierto.
-- Reemplaza el mensaje, el precio y la seña, y la deja 'enviada'. Devuelve el id de la postulación.

create or replace function public.reactivar_postulacion(
  p_trabajo_id uuid,
  p_mensaje text,
  p_precio_estimado integer default null,
  p_sena_propuesta integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_estado public.estado_postulacion;
  v_estado_trabajo public.estado_trabajo;
begin
  if v_uid is null
    or not privado.cuenta_activa()
    or privado.rol_actual() <> 'profesional'
    or not privado.perfil_publicado(v_uid)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_trabajo_id is null or p_mensaje is null then
    raise exception 'Datos requeridos' using errcode = '22023';
  end if;

  select po.id, po.estado
  into v_id, v_estado
  from public.postulaciones po
  where po.trabajo_id = p_trabajo_id
    and po.profesional_id = v_uid
  for update;

  if not found or v_estado <> 'retirada' then
    raise exception 'No hay una postulación retirada para reactivar' using errcode = 'P0002';
  end if;

  -- Bloquea el trabajo antes de mirar si sigue abierto: no compite con elegir_postulante (LAB-44).
  select t.estado
  into v_estado_trabajo
  from public.trabajos t
  where t.id = p_trabajo_id
  for update;

  if not found or v_estado_trabajo <> 'abierto' then
    raise exception 'Este trabajo ya no recibe postulaciones.' using errcode = '22023';
  end if;

  update public.postulaciones
  set estado = 'enviada',
      mensaje = p_mensaje,
      precio_estimado = p_precio_estimado,
      sena_propuesta = p_sena_propuesta
  where id = v_id;

  return v_id;
end;
$$;

revoke execute on function public.reactivar_postulacion(uuid, text, integer, integer) from public, anon;
grant execute on function public.reactivar_postulacion(uuid, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. trabajos_actualizar_propio: el cliente edita su trabajo solo mientras está abierto (LAB-44)
-- ---------------------------------------------------------------------------
-- Antes podía cambiar título, descripción, oficio, barrio, urgencia, presupuesto y fotos de un trabajo
-- asignado o cerrado. La columna `estado` y `profesional_elegido_id` ya no tienen privilegio (sección 3).

drop policy if exists trabajos_actualizar_propio on public.trabajos;
create policy trabajos_actualizar_propio on public.trabajos
  for update to authenticated
  using (
    cliente_id = (select auth.uid())
    and privado.cuenta_activa()
    and estado = 'abierto'
  )
  with check (
    cliente_id = (select auth.uid())
    and privado.cuenta_activa()
    and estado = 'abierto'
    and profesional_elegido_id is null
  );
