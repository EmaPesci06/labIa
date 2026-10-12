-- LAB-18 · Las rutas de fotos que el dueño guarda en su perfil tienen que estar en su propia
-- carpeta del bucket `fotos`. Hasta ahora lo validaba solo la Server Action; el dueño podía
-- escribir cualquier texto por PostgREST (usuarios.foto_path y perfiles_profesionales.fotos_trabajos).
--
--   usuarios.foto_path                 null o  perfiles/<usuario id>/<archivo>
--   perfiles_profesionales.fotos_trabajos  cada elemento  trabajos-hechos/<usuario id>/<archivo>
--   <archivo> = [A-Za-z0-9_-]+ . (jpg|jpeg|png|webp)

create function privado.ruta_foto_es_propia(p_ruta text, p_carpeta text, p_usuario uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_ruta ~ ('^' || p_carpeta || '/' || p_usuario::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
$$;

create function privado.rutas_fotos_son_propias(p_rutas text[], p_carpeta text, p_usuario uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(privado.ruta_foto_es_propia(r, p_carpeta, p_usuario)), true)
  from unnest(p_rutas) as r
$$;

revoke execute on function
  privado.ruta_foto_es_propia(text, text, uuid),
  privado.rutas_fotos_son_propias(text[], text, uuid)
from public;
grant execute on function
  privado.ruta_foto_es_propia(text, text, uuid),
  privado.rutas_fotos_son_propias(text[], text, uuid)
to anon, authenticated;

alter table public.usuarios
  add constraint usuarios_foto_path_propia check (
    foto_path is null or privado.ruta_foto_es_propia(foto_path, 'perfiles', id)
  );

alter table public.perfiles_profesionales
  add constraint perfiles_fotos_trabajos_propias check (
    privado.rutas_fotos_son_propias(fotos_trabajos, 'trabajos-hechos', usuario_id)
  );
