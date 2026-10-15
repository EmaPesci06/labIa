-- LAB-32 · Reportes y moderación: reportar perfiles, trabajos y reseñas, y suspender cuentas.
--
-- 1. Tabla acciones_moderacion:
--    Columna usuario_id para identificar directamente al usuario afectado por la acción.
--    Nadie escribe por la API: las acciones las registran las RPC security definer (y el
--    servidor con service role, en borrado de cuenta). Un admin solo lee.
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
--    - mi_motivo_suspension: el usuario suspendido consulta su propio motivo (sin parámetro).
--    - revocar_sesiones_admin: borra sesiones y refresh tokens de una cuenta (solo service_role).
-- 4. reportes.origen: 'usuario' o 'sistema' (triggers security definer). El límite diario y el
--    no autoreporte aplican solo a 'usuario'; el objetivo debe existir en todos los casos.
--
-- Orden: esta migración va después de 20261015070000_resenas_endurecer.sql (LAB-31). No redefine
-- ninguna función ni política de reseñas de LAB-31 (resenas_crear, resenas_validar_texto,
-- resenas_moderar, trabajo_mio_con_elegido, revoke delete). Lo único que se cruza es el trigger
-- resenas_moderar, que inserta en reportes: ese insert pasa por los triggers de este archivo con
-- origen 'sistema' (no cuenta para el límite ni para el autoreporte). ocultar_resena_admin borra
-- con privilegios del dueño, por la vía de moderación que LAB-31 deja reservada.

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

drop policy if exists acciones_moderacion_admin_leer on public.acciones_moderacion;
create policy acciones_moderacion_admin_leer on public.acciones_moderacion
  for select to authenticated
  using (privado.es_admin());

-- ---------------------------------------------------------------------------
-- 2. reportes: unicidad, rate limit y no autoreporte
-- ---------------------------------------------------------------------------

create unique index if not exists reportes_autor_objetivo_unique
  on public.reportes (autor_id, objetivo_tipo, objetivo_id)
  where autor_id is not null;

-- Origen: 'usuario' si lo insertó anon/authenticated por PostgREST; 'sistema' si lo abrió un
-- trigger security definer (corre como dueño, p. ej. resenas_moderar de LAB-31). Las reglas de
-- usuario (límite diario y no autoreportarse) solo aplican a 'usuario'. Nadie puede escribir la
-- columna por la API: el insert de usuarios no la incluye en sus grants.
alter table public.reportes
  add column if not exists origen text not null default 'usuario'
  check (origen in ('usuario', 'sistema'));

create or replace function privado.reportes_fijar_origen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.origen := case when current_user in ('anon', 'authenticated') then 'usuario' else 'sistema' end;
  return new;
end;
$$;

drop trigger if exists reportes_fijar_origen_trigger on public.reportes;
create trigger reportes_fijar_origen_trigger
before insert on public.reportes
for each row execute function privado.reportes_fijar_origen();

create or replace function privado.reportes_limite_diario()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta integer;
begin
  if new.origen = 'usuario' and new.autor_id is not null then
    select count(*) into v_cuenta
    from public.reportes
    where autor_id = new.autor_id
      and origen = 'usuario'
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

-- Reglas de contenido. El objetivo tiene que existir (a la vista de quien inserta) y, si lo
-- reporta un usuario, no puede ser propio. Los reportes del sistema sobre una reseña de su autor
-- (1-2 estrellas, LAB-31) no pasan por la regla de autoreporte.
-- Solo devuelve true/false: no expone datos del objetivo. Un perfil sin publicar cuenta como
-- inexistente: "no existe" y "no visible" dan el mismo error al reportar.
create or replace function privado.objetivo_existe(p_tipo text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_tipo
    when 'perfil' then exists (
      select 1 from public.perfiles_profesionales where usuario_id = p_id and publicado
    )
    when 'trabajo' then exists (select 1 from public.trabajos where id = p_id)
    when 'resena' then exists (select 1 from public.resenas where id = p_id)
    else false
  end;
$$;

revoke execute on function privado.objetivo_existe(text, uuid) from public, anon;
grant execute on function privado.objetivo_existe(text, uuid) to authenticated;

create or replace function privado.reportes_validar_objetivo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not privado.objetivo_existe(new.objetivo_tipo::text, new.objetivo_id) then
    raise exception 'El contenido reportado no existe' using errcode = 'P0002';
  end if;

  if new.origen = 'usuario' and new.autor_id is not null then
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

-- Motivo de suspensión para el usuario suspendido. Solo lee la cuenta de quien llama (auth.uid())
-- y solo si está suspendida: nunca el de otro usuario.
drop function if exists public.mi_motivo_suspension(uuid);

create or replace function public.mi_motivo_suspension()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select am.motivo
  from public.acciones_moderacion am
  join public.usuarios u on u.id = am.usuario_id
  where am.usuario_id = (select auth.uid())
    and am.accion = 'cuenta_suspendida'
    and u.estado = 'suspendida'
  order by am.created_at desc
  limit 1;
$$;

revoke execute on function public.mi_motivo_suspension() from public, anon;
grant execute on function public.mi_motivo_suspension() to authenticated;

-- Revocar sesiones de una cuenta (la usa el servidor de /admin tras suspenderla). El SDK de Auth
-- solo cierra sesiones con el JWT del propio usuario, así que se borran las filas de auth.
-- Solo service_role puede ejecutarla.
create or replace function public.revocar_sesiones_admin(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.usuarios where id = p_usuario_id and rol = 'admin') then
    raise exception 'No se revocan las sesiones de un admin' using errcode = '22023';
  end if;
  delete from auth.refresh_tokens where user_id = p_usuario_id::text;
  delete from auth.sessions where user_id = p_usuario_id;
end;
$$;

revoke execute on function public.revocar_sesiones_admin(uuid) from public, anon, authenticated;
grant execute on function public.revocar_sesiones_admin(uuid) to service_role;

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
