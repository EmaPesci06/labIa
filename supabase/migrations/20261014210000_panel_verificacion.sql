-- LAB-21 · Panel de verificación del equipo (rol admin).
--
--   · Retención: cada documento decidido (o reemplazado) guarda `borrar_despues_de`. Un job diario
--     (/api/cron/limpiar-documentos, service role) borra el archivo cuando vence y marca
--     `archivo_borrado_at`. Los reemplazados caducan a 1 día; los decididos, a 30 días.
--   · Huérfanos: archivos del bucket que no tienen fila en `verificaciones` (subida que no se
--     registró) se borran después de 24 h. `documentos_huerfanos` los lista para el job.
--   · Cuota: cada cuenta puede tener hasta 12 archivos en `documentos` (`privado.cantidad_documentos_propios`).
--   · Decisiones: `decidir_documento` es la única vía para aprobar o rechazar. Valida rol admin y que el
--     documento esté pendiente, guarda quién y cuándo, recalcula las insignias del perfil y deja una
--     fila en `acciones_moderacion`.
--   · Auditoría: `accesos_documentos` registra cada URL firmada que un admin pidió para ver un archivo.

-- ---------------------------------------------------------------------------
-- 1. Retención
-- ---------------------------------------------------------------------------

alter table public.verificaciones
  add column borrar_despues_de timestamptz,
  add column archivo_borrado_at timestamptz;

create index verificaciones_borrado_pendiente_idx
  on public.verificaciones (borrar_despues_de)
  where archivo_borrado_at is null and borrar_despues_de is not null;

create function privado.verificaciones_programar_borrado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'pendiente' and new.estado in ('aprobado', 'rechazado') then
    if new.motivo_rechazo = 'Reemplazado por un documento nuevo' then
      new.borrar_despues_de := now() + interval '1 day';
    else
      new.borrar_despues_de := now() + interval '30 days';
    end if;
  end if;
  return new;
end;
$$;

create trigger verificaciones_programar_borrado
before update of estado on public.verificaciones
for each row execute function privado.verificaciones_programar_borrado();

revoke execute on function privado.verificaciones_programar_borrado() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Cuota de subida por cuenta (bucket documentos)
-- ---------------------------------------------------------------------------

-- Cuenta los archivos de la carpeta del usuario. Va en `privado` y es security definer porque el
-- dueño no tiene permiso de lectura sobre el bucket documentos (si no, el conteo siempre daría 0).
create function privado.cantidad_documentos_propios()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects o
  where o.bucket_id = 'documentos'
    and o.name like (select auth.uid())::text || '/%'
$$;

revoke execute on function privado.cantidad_documentos_propios() from public, anon;
grant execute on function privado.cantidad_documentos_propios() to authenticated;

-- Lock por usuario + conteo: dos subidas simultáneas de la misma cuenta no pueden pasar el tope.
-- Volatile porque toma un advisory lock; se libera al terminar la transacción.
create function privado.documento_cabe()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $
begin
  perform pg_advisory_xact_lock(hashtext('documentos:' || (select auth.uid())::text));
  return privado.cantidad_documentos_propios() < 12;
end;
$;

revoke execute on function privado.documento_cabe() from public, anon;
grant execute on function privado.documento_cabe() to authenticated;

-- Misma regla de subida que LAB-12, con el tope de 12 archivos por cuenta.
drop policy documentos_subir_propios on storage.objects;

create policy documentos_subir_propios on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and privado.documento_cabe()
    and name ~ (
      '^' || (select auth.uid())::text
      || '/(dni_frente|dni_dorso|antecedentes|matricula)-[0-9]+\.(jpg|jpeg|png|pdf)$'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Insignias y decisiones
-- ---------------------------------------------------------------------------

-- La insignia vale según la última decisión de cada tipo (los pendientes no cuentan). Así un
-- rechazo nuevo la baja, y un documento aprobado que todavía no fue reemplazado sigue valiendo.
create function privado.recalcular_insignias(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles_profesionales p
  set identidad_verificada = (
        coalesce((
          select u.estado = 'aprobado' from (
            select distinct on (v.tipo) v.tipo, v.estado
            from public.verificaciones v
            where v.usuario_id = p_usuario and v.estado <> 'pendiente'
            order by v.tipo, v.revisado_at desc nulls last, v.created_at desc
          ) u where u.tipo = 'dni_frente'
        ), false)
        and coalesce((
          select u.estado = 'aprobado' from (
            select distinct on (v.tipo) v.tipo, v.estado
            from public.verificaciones v
            where v.usuario_id = p_usuario and v.estado <> 'pendiente'
            order by v.tipo, v.revisado_at desc nulls last, v.created_at desc
          ) u where u.tipo = 'dni_dorso'
        ), false)
      ),
      antecedentes_ok = coalesce((
        select u.estado = 'aprobado' from (
          select distinct on (v.tipo) v.tipo, v.estado
          from public.verificaciones v
          where v.usuario_id = p_usuario and v.estado <> 'pendiente'
          order by v.tipo, v.revisado_at desc nulls last, v.created_at desc
        ) u where u.tipo = 'antecedentes'
      ), false),
      matriculado = coalesce((
        select u.estado = 'aprobado' from (
          select distinct on (v.tipo) v.tipo, v.estado
          from public.verificaciones v
          where v.usuario_id = p_usuario and v.estado <> 'pendiente'
          order by v.tipo, v.revisado_at desc nulls last, v.created_at desc
        ) u where u.tipo = 'matricula'
      ), false)
  where p.usuario_id = p_usuario;
end;
$$;

revoke execute on function privado.recalcular_insignias(uuid) from public, anon, authenticated;

create function public.decidir_documento(
  p_verificacion uuid,
  p_aprobar boolean,
  p_motivo text default null,
  p_detalle text default null
)
returns table (r_usuario_id uuid, r_tipo public.tipo_documento, r_estado public.estado_verificacion)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_fila public.verificaciones%rowtype;
  v_motivo text;
  v_estado public.estado_verificacion;
begin
  if v_admin is null or not privado.es_admin() then
    raise exception 'Solo un admin puede revisar documentos' using errcode = 'insufficient_privilege';
  end if;

  select * into v_fila from public.verificaciones where id = p_verificacion for update;
  if not found then
    raise exception 'La verificación no existe' using errcode = 'no_data_found';
  end if;
  if v_fila.estado <> 'pendiente' then
    raise exception 'La verificación ya fue revisada' using errcode = 'check_violation';
  end if;

  if p_aprobar then
    v_motivo := null;
    v_estado := 'aprobado';
  else
    if p_motivo is null or char_length(trim(p_motivo)) = 0 then
      raise exception 'Falta el motivo del rechazo' using errcode = 'check_violation';
    end if;
    v_motivo := left(
      trim(p_motivo) || case when coalesce(trim(p_detalle), '') = '' then '' else ': ' || trim(p_detalle) end,
      500
    );
    v_estado := 'rechazado';
  end if;

  update public.verificaciones
  set estado = v_estado,
      motivo_rechazo = v_motivo,
      revisado_por = v_admin,
      revisado_at = now()
  where id = p_verificacion;

  perform privado.recalcular_insignias(v_fila.usuario_id);

  insert into public.acciones_moderacion (admin_id, accion, objetivo_id, motivo)
  values (
    v_admin,
    case when p_aprobar then 'verificacion_aprobada' else 'verificacion_rechazada' end,
    p_verificacion,
    v_motivo
  );

  return query select v_fila.usuario_id, v_fila.tipo, v_estado;
end;
$$;

revoke execute on function public.decidir_documento(uuid, boolean, text, text) from public, anon;
grant execute on function public.decidir_documento(uuid, boolean, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Huérfanos (solo el job de servidor)
-- ---------------------------------------------------------------------------

create function public.documentos_huerfanos(p_antes timestamptz)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'documentos'
    and o.created_at < p_antes
    and not exists (select 1 from public.verificaciones v where v.storage_path = o.name)
$$;

revoke execute on function public.documentos_huerfanos(timestamptz) from public, anon, authenticated;
grant execute on function public.documentos_huerfanos(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Auditoría de accesos a documentos
-- ---------------------------------------------------------------------------

create table public.accesos_documentos (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.usuarios (id) on delete set null,
  storage_path text not null check (char_length(storage_path) <= 300),
  created_at timestamptz not null default now()
);

create index accesos_documentos_admin_id_idx on public.accesos_documentos (admin_id);
create index accesos_documentos_created_at_idx on public.accesos_documentos (created_at);

alter table public.accesos_documentos enable row level security;

revoke all on table public.accesos_documentos from anon, authenticated;
grant select on public.accesos_documentos to authenticated;

-- Solo un admin lee. La escribe el servidor con la service role (firmarDocumento).
create policy accesos_documentos_admin_leer on public.accesos_documentos
  for select to authenticated
  using (privado.es_admin());

-- ---------------------------------------------------------------------------
-- 6. Correcciones de la revisión de seguridad (PR #30)
-- ---------------------------------------------------------------------------

-- Un admin suspendido con un JWT vigente deja de pasar los chequeos de la base (no solo de la app).
create or replace function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.rol = 'admin' and u.estado = 'activa' from public.usuarios u where u.id = (select auth.uid())),
    false
  )
$$;

-- El admin no lee el bucket con su JWT: las URLs firmadas las pide el servidor con la service role
-- (firmarDocumento), que deja registro en accesos_documentos y firma 60 s.
drop policy if exists documentos_admin_leer on storage.objects;

-- La decisión es solo por decidir_documento (recalcula insignias, auditoría y avisos). Nadie
-- cambia el estado de una verificación a mano desde la API.
drop policy if exists verificaciones_admin_actualizar on public.verificaciones;
revoke update on public.verificaciones from authenticated;
revoke update (estado, motivo_rechazo, revisado_por, revisado_at) on public.verificaciones from authenticated;
