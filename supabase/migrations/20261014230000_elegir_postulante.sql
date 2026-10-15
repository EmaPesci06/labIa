-- LAB-29 · Mis trabajos del cliente: elegir postulante, cambiar profesional, marcar terminado y cancelar.
--
-- 1. elegir_postulante(p_postulacion_id uuid):
--    Transaccional y security definer. Valida que el cliente sea dueño de un trabajo abierto y que la
--    postulación esté 'enviada'. Pasa la elegida a 'elegida', las otras activas a 'descartada' y el
--    trabajo a 'asignado'. Devuelve el id del profesional elegido.
-- 2. cambiar_profesional(p_trabajo_id uuid):
--    Vuelve el trabajo de 'asignado' a 'abierto', la elegida a 'descartada' y las que estaban
--    descartadas vuelven a 'enviada' (para darles otra oportunidad).
-- 3. marcar_trabajo_terminado(p_trabajo_id uuid):
--    Pasa el trabajo de 'asignado' a 'cerrado' para habilitar la reseña.
-- 4. cancelar_trabajo(p_trabajo_id uuid):
--    Cancela un trabajo abierto o asignado y descarta las postulaciones activas.

-- ---------------------------------------------------------------------------
-- 1. Función elegir_postulante
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
  for update of t;

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

  -- 1. Marcar postulación elegida
  update public.postulaciones
  set estado = 'elegida'
  where id = p_postulacion_id;

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
-- 2. Función cambiar_profesional
-- ---------------------------------------------------------------------------

create or replace function public.cambiar_profesional(p_trabajo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cliente_id uuid;
  v_trabajo_estado public.estado_trabajo;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'cliente' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_trabajo_id is null then
    raise exception 'Trabajo requerido' using errcode = '22023';
  end if;

  select t.cliente_id, t.estado
  into v_cliente_id, v_trabajo_estado
  from public.trabajos t
  where t.id = p_trabajo_id
  for update;

  if not found then
    raise exception 'Trabajo no encontrado' using errcode = 'P0002';
  end if;

  if v_cliente_id <> v_uid then
    raise exception 'El trabajo no te pertenece' using errcode = '42501';
  end if;

  if v_trabajo_estado <> 'asignado' then
    raise exception 'Solo podés cambiar de profesional en trabajos contratados' using errcode = '22023';
  end if;

  -- 1. Las descartadas vuelven a enviada (para que vuelvan a competir, salvo que hayan sido retiradas)
  update public.postulaciones
  set estado = 'enviada'
  where trabajo_id = p_trabajo_id
    and estado = 'descartada';

  -- 2. La que estaba elegida pasa a descartada
  update public.postulaciones
  set estado = 'descartada'
  where trabajo_id = p_trabajo_id
    and estado = 'elegida';

  -- 3. El trabajo vuelve a abierto
  update public.trabajos
  set estado = 'abierto',
      profesional_elegido_id = null
  where id = p_trabajo_id;

  return true;
end;
$$;

revoke execute on function public.cambiar_profesional(uuid) from public, anon;
grant execute on function public.cambiar_profesional(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Función marcar_trabajo_terminado
-- ---------------------------------------------------------------------------

create or replace function public.marcar_trabajo_terminado(p_trabajo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cliente_id uuid;
  v_trabajo_estado public.estado_trabajo;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'cliente' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_trabajo_id is null then
    raise exception 'Trabajo requerido' using errcode = '22023';
  end if;

  select t.cliente_id, t.estado
  into v_cliente_id, v_trabajo_estado
  from public.trabajos t
  where t.id = p_trabajo_id
  for update;

  if not found then
    raise exception 'Trabajo no encontrado' using errcode = 'P0002';
  end if;

  if v_cliente_id <> v_uid then
    raise exception 'El trabajo no te pertenece' using errcode = '42501';
  end if;

  if v_trabajo_estado <> 'asignado' then
    raise exception 'Solo podés marcar como terminado un trabajo contratado' using errcode = '22023';
  end if;

  update public.trabajos
  set estado = 'cerrado'
  where id = p_trabajo_id;

  return true;
end;
$$;

revoke execute on function public.marcar_trabajo_terminado(uuid) from public, anon;
grant execute on function public.marcar_trabajo_terminado(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Función cancelar_trabajo
-- ---------------------------------------------------------------------------

create or replace function public.cancelar_trabajo(p_trabajo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cliente_id uuid;
  v_trabajo_estado public.estado_trabajo;
begin
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'cliente' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_trabajo_id is null then
    raise exception 'Trabajo requerido' using errcode = '22023';
  end if;

  select t.cliente_id, t.estado
  into v_cliente_id, v_trabajo_estado
  from public.trabajos t
  where t.id = p_trabajo_id
  for update;

  if not found then
    raise exception 'Trabajo no encontrado' using errcode = 'P0002';
  end if;

  if v_cliente_id <> v_uid then
    raise exception 'El trabajo no te pertenece' using errcode = '42501';
  end if;

  if v_trabajo_estado in ('cerrado', 'cancelado') then
    raise exception 'El trabajo ya fue cerrado o cancelado' using errcode = '22023';
  end if;

  -- Descartar postulaciones activas
  update public.postulaciones
  set estado = 'descartada'
  where trabajo_id = p_trabajo_id
    and estado in ('enviada', 'elegida');

  update public.trabajos
  set estado = 'cancelado',
      profesional_elegido_id = null
  where id = p_trabajo_id;

  return true;
end;
$$;

revoke execute on function public.cancelar_trabajo(uuid) from public, anon;
grant execute on function public.cancelar_trabajo(uuid) to authenticated;
