-- LAB-52 · Las fotos de trabajos (interior o fachada de la casa del cliente) dejan el bucket
-- público `fotos` y pasan a `fotos-trabajos`, privado. Se leen con URL firmada de 10 min generada
-- en el servidor con la sesión de quien mira: la política de Storage refleja la visibilidad del
-- trabajo (la RLS de `trabajos` decide). Las fotos de perfil y de portfolio siguen en `fotos`.
--
--   fotos-trabajos  privado. Ruta: <cliente_id>/<trabajo_id>/<índice>-<ms>.jpg (jpeg/webp/png, máx. 3 MB).
--     · el cliente dueño sube y borra en la carpeta de sus trabajos,
--     · lee quien ve el trabajo (dueño, profesional que lo ve en /trabajos y en el detalle, admin),
--     · anon no lee nada.
--   trabajos.fotos guarda esa ruta. Se borran al cancelar o cerrar (de inmediato, con la sesión
--   del cliente o del admin) y 30 días después de terminado (job /api/cron/limpiar-fotos-trabajos).
--   La columna `fotos_borrar_despues_de` la fija un trigger; ningún rol la escribe directamente.
--
-- Filas viejas con fotos en el bucket público (`trabajos/<id>/…`): ver docs/operacion.md.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-trabajos', 'fotos-trabajos', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Políticas de Storage del bucket nuevo
-- ---------------------------------------------------------------------------

-- Tope de fotos por trabajo. Fuente única en SQL; el mismo número es MAX_FOTOS en
-- src/lib/validaciones/trabajo.ts. Si cambia uno, cambiar el otro.
create function privado.fotos_trabajo_max()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 4
$$;

-- Cuenta las fotos de la carpeta <cliente>/<trabajo>/ del objeto dado. Corre como dueño de la tabla
-- (security definer), así no pasa por la RLS de storage.objects: un subselect ahí dentro de la policy
-- de insert recursiona (42P17). Toma un lock transaccional por carpeta: dos subidas simultáneas al
-- mismo trabajo se serializan, y la segunda cuenta la foto que la primera ya confirmó.
create function privado.fotos_trabajo_cantidad(p_nombre text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carpeta text := split_part(p_nombre, '/', 1) || '/' || split_part(p_nombre, '/', 2) || '/';
begin
  perform pg_advisory_xact_lock(hashtext(v_carpeta));
  return (
    select count(*) from storage.objects o
    where o.bucket_id = 'fotos-trabajos'
      and starts_with(o.name, v_carpeta)
  );
end;
$$;

revoke execute on function privado.fotos_trabajo_max() from public, anon;
revoke execute on function privado.fotos_trabajo_cantidad(text) from public, anon;
grant execute on function privado.fotos_trabajo_max() to authenticated;
grant execute on function privado.fotos_trabajo_cantidad(text) to authenticated;

create policy fotos_trabajos_subir_propias on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-trabajos'
    and privado.rol_actual() = 'cliente'
    and privado.cuenta_activa()
    and name ~ (
      '^' || (select auth.uid())::text
      || '/[0-9a-fA-F-]{36}/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'
    )
    and exists (
      select 1 from public.trabajos t
      where t.id::text = (storage.foldername(name))[2]
        and t.cliente_id = (select auth.uid())
        and t.estado = 'abierto'
    )
    -- Tope de fotos por trabajo (privado.fotos_trabajo_max). Solo se evalúa en este bucket: el CASE
    -- garantiza el orden, así que la función nunca corre para otros buckets.
    and case
      when bucket_id = 'fotos-trabajos'
        then privado.fotos_trabajo_cantidad(name) < privado.fotos_trabajo_max()
      else true
    end
  );

-- Quien puede ver el trabajo puede leer sus fotos. La subconsulta corre con la RLS de `trabajos`
-- de quien pide el archivo, así que la visibilidad es la misma que la del trabajo.
create policy fotos_trabajos_leer_visibles on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fotos-trabajos'
    -- Un profesional suspendido no ve nada, aunque tenga el trabajo asignado (la policy de
    -- trabajos por asignación no exige cuenta activa).
    and privado.cuenta_activa()
    and exists (
      select 1 from public.trabajos t
      where t.id::text = (storage.foldername(name))[2]
        and t.cliente_id::text = (storage.foldername(name))[1]
    )
  );

-- Borrar en cualquier estado del trabajo es intencional: el dueño puede quitar sus propias fotos
-- (la acción de cancelar, o cuando quiera). Solo el dueño de la carpeta; los profesionales y otros
-- clientes no borran nada. El borrado de las fotos vencidas lo hace el job con la service role.
create policy fotos_trabajos_borrar_propias on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-trabajos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.trabajos t
      where t.id::text = (storage.foldername(name))[2]
        and t.cliente_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Las fotos del bucket público `fotos` ya no admiten carpetas de trabajos
-- ---------------------------------------------------------------------------

create or replace function privado.ruta_foto_permitida(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case (storage.foldername(p_nombre))[1]
      when 'perfiles' then (storage.foldername(p_nombre))[2] = (select auth.uid())::text
      when 'trabajos-hechos' then (storage.foldername(p_nombre))[2] = (select auth.uid())::text
      else false
    end,
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- trabajos.fotos: la ruta incluye la carpeta del cliente (<cliente_id>/<trabajo_id>/…)
-- ---------------------------------------------------------------------------

alter table public.trabajos drop constraint trabajos_fotos_propias;
drop function privado.rutas_fotos_de_trabajo(text[], uuid);

create function privado.rutas_fotos_de_trabajo(p_rutas text[], p_cliente uuid, p_trabajo uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(
      r ~ ('^' || p_cliente::text || '/' || p_trabajo::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
    ),
    true
  )
  from unnest(p_rutas) as r
$$;

revoke execute on function privado.rutas_fotos_de_trabajo(text[], uuid, uuid) from public;
grant execute on function privado.rutas_fotos_de_trabajo(text[], uuid, uuid) to anon, authenticated;

-- NOT VALID: las filas que ya tienen fotos en la ruta vieja no se revalidan (en producción no hay).
-- Cualquier escritura de esa fila vuelve a validarla: ver docs/operacion.md para limpiarlas.
alter table public.trabajos
  add constraint trabajos_fotos_propias
  check (privado.rutas_fotos_de_trabajo(fotos, cliente_id, id)) not valid;

-- ---------------------------------------------------------------------------
-- Fecha de borrado de las fotos, fijada por trigger según el estado
-- ---------------------------------------------------------------------------

alter table public.trabajos add column fotos_borrar_despues_de timestamptz;

create function privado.trabajos_programar_borrado_fotos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'cancelado' then
      new.fotos_borrar_despues_de := now();
    elsif new.estado = 'cerrado' then
      new.fotos_borrar_despues_de := now() + interval '30 days';
    elsif new.estado = 'abierto' then
      -- Un trabajo que vuelve a estar abierto conserva sus fotos.
      new.fotos_borrar_despues_de := null;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function privado.trabajos_programar_borrado_fotos() from public, anon, authenticated;

create trigger trabajos_programar_borrado_fotos
  before update of estado on public.trabajos
  for each row execute function privado.trabajos_programar_borrado_fotos();
