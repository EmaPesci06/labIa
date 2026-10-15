-- LAB-32 · Reportes y moderación: reportar perfiles, trabajos y reseñas, y suspender cuentas.
--
-- 1. Tabla acciones_moderacion:
--    Columna usuario_id para identificar directamente al usuario afectado por la acción.
--    Permiso de insert para authenticated con verificación de privado.es_admin().
-- 2. Tabla reportes:
--    Índice único para evitar que un usuario reporte dos veces el mismo objetivo.
--    Trigger que limita a 10 reportes por usuario por ventana de 24 horas.
--    Trigger que impide autoreportes (reportar propio perfil, trabajo o reseña).
-- 3. Funciones RPC de moderación (security definer, solo admin):
--    - suspender_cuenta_admin: usuarios.estado = 'suspendida', cancela trabajos abiertos,
--      retira postulaciones enviadas y registra en acciones_moderacion.
--    - reactivar_cuenta_admin: usuarios.estado = 'activa' y registra en acciones_moderacion.
--    - cerrar_trabajo_admin: trabajos.estado = 'cancelado', descarta postulaciones y registra.
--    - ocultar_resena_admin: borra la reseña (trigger recalcula promedio) y registra.
--    - marcar_reporte_en_revision: reportes.estado = 'en_revision' y registra.
--    - resolver_reporte: reportes.estado = 'resuelto', resuelto_por = admin y registra.
--    - mi_motivo_suspension: permite al usuario suspendido consultar su motivo de suspensión.

-- ---------------------------------------------------------------------------
-- 1. acciones_moderacion
-- ---------------------------------------------------------------------------

create table if not exists public.acciones_moderacion (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.usuarios (id) on delete set null,
  accion text not null check (char_length(accion) between 1 and 60),
  objetivo_id uuid,
  motivo text check (char_length(motivo) <= 500),
  created_at timestamptz not null default now()
);

alter table public.acciones_moderacion
  add column if not exists usuario_id uuid references public.usuarios (id) on delete set null;

create index if not exists acciones_moderacion_usuario_id_idx on public.acciones_moderacion (usuario_id);

alter table public.acciones_moderacion enable row level security;

revoke all on table public.acciones_moderacion from anon, authenticated;
grant select on public.acciones_moderacion to authenticated;
grant insert on public.acciones_moderacion to authenticated;

drop policy if exists acciones_moderacion_admin_leer on public.acciones_moderacion;
create policy acciones_moderacion_admin_leer on public.acciones_moderacion
  for select to authenticated
  using (privado.es_admin());

drop policy if exists acciones_moderacion_admin_insert on public.acciones_moderacion;
create policy acciones_moderacion_admin_insert on public.acciones_moderacion
  for insert to authenticated
  with check (privado.es_admin());

-- ---------------------------------------------------------------------------
-- 2. reportes: unicidad, rate limit y no autoreporte
-- ---------------------------------------------------------------------------

create unique index if not exists reportes_autor_objetivo_unique
  on public.reportes (autor_id, objetivo_tipo, objetivo_id)
  where autor_id is not null;

create or replace function privado.reportes_limite_diario()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta integer;
begin
  if new.autor_id is not null then
    select count(*) into v_cuenta
    from public.reportes
    where autor_id = new.autor_id
      and created_at > now() - interval '24 hours';
    if v_cuenta >= 10 then
      raise exception 'Alcanzaste el límite de 10 reportes por día' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reportes_limite_diario_trigger on public.reportes;
create trigger reportes_limite_diario_trigger
before insert on public.reportes
for each row execute function privado.reportes_limite_diario();

create or replace function privado.reportes_validar_objetivo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.autor_id is not null then
    if new.objetivo_tipo = 'perfil' and new.objetivo_id = new.autor_id then
      raise exception 'No podés reportar tu propio perfil' using errcode = '23514';
    elsif new.objetivo_tipo = 'trabajo' and exists (
      select 1 from public.trabajos where id = new.objetivo_id and cliente_id = new.autor_id
    ) then
      raise exception 'No podés reportar tu propio trabajo' using errcode = '23514';
    elsif new.objetivo_tipo = 'resena' and exists (
      select 1 from public.resenas where id = new.objetivo_id and autor_id = new.autor_id
    ) then
      raise exception 'No podés reportar tu propia reseña' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reportes_validar_objetivo_trigger on public.reportes;
create trigger reportes_validar_objetivo_trigger
before insert on public.reportes
for each row execute function privado.reportes_validar_objetivo();

-- ---------------------------------------------------------------------------
-- 3. Funciones RPC de moderación
-- ---------------------------------------------------------------------------

-- Motivo de suspensión para el usuario suspendido
create or replace function public.mi_motivo_suspension(p_usuario_id uuid default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select motivo
  from public.acciones_moderacion
  where objetivo_id = coalesce(p_usuario_id, (select auth.uid()))
    and accion = 'cuenta_suspendida'
  order by created_at desc
  limit 1;
$$;

revoke execute on function public.mi_motivo_suspension(uuid) from public, anon;
grant execute on function public.mi_motivo_suspension(uuid) to authenticated;

-- Suspender cuenta
create or replace function public.suspender_cuenta_admin(
  p_usuario_id uuid,
  p_motivo text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_rol public.rol;
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede suspender cuentas' using errcode = '42501';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuario requerido' using errcode = '22023';
  end if;

  if char_length(v_motivo) = 0 then
    raise exception 'El motivo de suspensión es obligatorio' using errcode = '22023';
  end if;

  select rol into v_rol from public.usuarios where id = p_usuario_id for update;
  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  if v_rol = 'admin' then
    raise exception 'No se puede suspender a un admin' using errcode = '22023';
  end if;

  -- 1. Actualizar estado del usuario a 'suspendida'
  update public.usuarios
  set estado = 'suspendida'
  where id = p_usuario_id;

  -- 2. Trabajos abiertos pasan a 'cancelado'
  update public.trabajos
  set estado = 'cancelado',
      profesional_elegido_id = null
  where cliente_id = p_usuario_id
    and estado = 'abierto';

  -- Descartar postulaciones asociadas a trabajos cancelados
  update public.postulaciones
  set estado = 'descartada'
  where trabajo_id in (select id from public.trabajos where cliente_id = p_usuario_id and estado = 'cancelado')
    and estado in ('enviada', 'elegida');

  -- 3. Postulaciones enviadas pasan a 'retirada'
  update public.postulaciones
  set estado = 'retirada'
  where profesional_id = p_usuario_id
    and estado = 'enviada';

  -- 4. Registrar acción en acciones_moderacion
  insert into public.acciones_moderacion (admin_id, usuario_id, accion, objetivo_id, motivo)
  values (v_admin, p_usuario_id, 'cuenta_suspendida', p_usuario_id, left(v_motivo, 500));

  return true;
end;
$$;

revoke execute on function public.suspender_cuenta_admin(uuid, text) from public, anon;
grant execute on function public.suspender_cuenta_admin(uuid, text) to authenticated;

-- Reactivar cuenta
create or replace function public.reactivar_cuenta_admin(
  p_usuario_id uuid,
  p_motivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede reactivar cuentas' using errcode = '42501';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuario requerido' using errcode = '22023';
  end if;

  update public.usuarios
  set estado = 'activa'
  where id = p_usuario_id;

  if not found then
    raise exception 'Usuario no encontrado' using errcode = 'P0002';
  end if;

  insert into public.acciones_moderacion (admin_id, usuario_id, accion, objetivo_id, motivo)
  values (v_admin, p_usuario_id, 'cuenta_reactivada', p_usuario_id, left(trim(coalesce(p_motivo, '')), 500));

  return true;
end;
$$;

revoke execute on function public.reactivar_cuenta_admin(uuid, text) from public, anon;
grant execute on function public.reactivar_cuenta_admin(uuid, text) to authenticated;

-- Cerrar trabajo (pasa a cancelado)
create or replace function public.cerrar_trabajo_admin(
  p_trabajo_id uuid,
  p_motivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_cliente_id uuid;
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede cerrar trabajos' using errcode = '42501';
  end if;

  if p_trabajo_id is null then
    raise exception 'Trabajo requerido' using errcode = '22023';
  end if;

  select cliente_id into v_cliente_id from public.trabajos where id = p_trabajo_id for update;
  if not found then
    raise exception 'Trabajo no encontrado' using errcode = 'P0002';
  end if;

  update public.postulaciones
  set estado = 'descartada'
  where trabajo_id = p_trabajo_id
    and estado in ('enviada', 'elegida');

  update public.trabajos
  set estado = 'cancelado',
      profesional_elegido_id = null
  where id = p_trabajo_id;

  insert into public.acciones_moderacion (admin_id, usuario_id, accion, objetivo_id, motivo)
  values (v_admin, v_cliente_id, 'trabajo_cerrado', p_trabajo_id, left(trim(coalesce(p_motivo, '')), 500));

  return true;
end;
$$;

revoke execute on function public.cerrar_trabajo_admin(uuid, text) from public, anon;
grant execute on function public.cerrar_trabajo_admin(uuid, text) to authenticated;

-- Ocultar reseña (borra la reseña y recalcula promedio por trigger)
create or replace function public.ocultar_resena_admin(
  p_resena_id uuid,
  p_motivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_autor_id uuid;
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede ocultar reseñas' using errcode = '42501';
  end if;

  if p_resena_id is null then
    raise exception 'Reseña requerida' using errcode = '22023';
  end if;

  select autor_id into v_autor_id from public.resenas where id = p_resena_id for update;
  if not found then
    raise exception 'Reseña no encontrada' using errcode = 'P0002';
  end if;

  delete from public.resenas where id = p_resena_id;

  insert into public.acciones_moderacion (admin_id, usuario_id, accion, objetivo_id, motivo)
  values (v_admin, v_autor_id, 'resena_ocultada', p_resena_id, left(trim(coalesce(p_motivo, '')), 500));

  return true;
end;
$$;

revoke execute on function public.ocultar_resena_admin(uuid, text) from public, anon;
grant execute on function public.ocultar_resena_admin(uuid, text) to authenticated;

-- Marcar reporte en revisión
create or replace function public.marcar_reporte_en_revision(p_reporte_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede moderar reportes' using errcode = '42501';
  end if;

  if p_reporte_id is null then
    raise exception 'Reporte requerido' using errcode = '22023';
  end if;

  update public.reportes
  set estado = 'en_revision',
      updated_at = now()
  where id = p_reporte_id;

  if not found then
    raise exception 'Reporte no encontrado' using errcode = 'P0002';
  end if;

  insert into public.acciones_moderacion (admin_id, accion, objetivo_id)
  values (v_admin, 'reporte_en_revision', p_reporte_id);

  return true;
end;
$$;

revoke execute on function public.marcar_reporte_en_revision(uuid) from public, anon;
grant execute on function public.marcar_reporte_en_revision(uuid) to authenticated;

-- Resolver reporte (con o sin acción)
create or replace function public.resolver_reporte(
  p_reporte_id uuid,
  p_con_accion boolean,
  p_motivo text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede resolver reportes' using errcode = '42501';
  end if;

  if p_reporte_id is null then
    raise exception 'Reporte requerido' using errcode = '22023';
  end if;

  update public.reportes
  set estado = 'resuelto',
      resuelto_por = v_admin,
      updated_at = now()
  where id = p_reporte_id;

  if not found then
    raise exception 'Reporte no encontrado' using errcode = 'P0002';
  end if;

  insert into public.acciones_moderacion (admin_id, accion, objetivo_id, motivo)
  values (
    v_admin,
    case when p_con_accion then 'reporte_resuelto_con_accion' else 'reporte_resuelto_sin_accion' end,
    p_reporte_id,
    left(trim(coalesce(p_motivo, '')), 500)
  );

  return true;
end;
$$;

revoke execute on function public.resolver_reporte(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_reporte(uuid, boolean, text) to authenticated;
