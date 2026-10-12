-- LAB-12 · Buckets de Storage y sus políticas (Guía §7.2).
--
--   fotos       público para lectura (la URL pública no pasa por RLS). Rutas:
--               perfiles/<uid>/…  ·  trabajos-hechos/<uid>/…  ·  trabajos/<trabajo_id>/…
--               Solo el dueño sube y borra en su carpeta. jpeg/webp/png, máx. 3 MB.
--   documentos  privado. Ruta: <uid>/<tipo>-<timestamp>.<ext>. El dueño solo puede INSERTAR
--               (ni leer, ni listar, ni actualizar, ni borrar). Lee un admin; la service role
--               firma URLs de 60 s. jpeg/png/pdf, máx. 8 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', true, 3145728, array['image/jpeg', 'image/webp', 'image/png']),
  ('documentos', 'documentos', false, 8388608, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- fotos
-- ---------------------------------------------------------------------------

create policy fotos_subir_propias on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and privado.cuenta_activa()
    and privado.ruta_foto_permitida(name)
  );

-- Leer sus propios archivos hace falta para que la API de Storage pueda borrarlos y listarlos;
-- la lectura pública del bucket va por la URL pública y no depende de esta política.
create policy fotos_leer_propias on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and privado.ruta_foto_permitida(name));

create policy fotos_borrar_propias on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and privado.ruta_foto_permitida(name));

-- ---------------------------------------------------------------------------
-- documentos
-- ---------------------------------------------------------------------------

-- El profesional solo inserta, y solo en su carpeta con el nombre <tipo>-<timestamp>.<ext>.
create policy documentos_subir_propios on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and privado.rol_actual() = 'profesional'
    and privado.cuenta_activa()
    and name ~ (
      '^' || (select auth.uid())::text
      || '/(dni_frente|dni_dorso|antecedentes|matricula)-[0-9]+\.(jpg|jpeg|png|pdf)$'
    )
  );

-- Solo un admin lee (la service role también, porque saltea RLS). No hay políticas de
-- update ni delete: nadie modifica ni borra un documento desde la API.
create policy documentos_admin_leer on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and privado.es_admin());
