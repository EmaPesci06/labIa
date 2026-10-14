-- LAB-26 · Las fotos de un trabajo tienen que estar en la carpeta de ese trabajo del bucket `fotos`.
-- Hasta ahora lo validaba solo la Server Action: el cliente podía escribir cualquier texto en
-- `trabajos.fotos` por PostgREST, y los profesionales lo van a ver (LAB-27/28).
--
--   trabajos.fotos  cada elemento  trabajos/<id del trabajo>/<archivo>
--   <archivo> = [A-Za-z0-9_-]+ . (jpg|jpeg|png|webp)

create function privado.rutas_fotos_de_trabajo(p_rutas text[], p_trabajo uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(r ~ ('^trabajos/' || p_trabajo::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')),
    true
  )
  from unnest(p_rutas) as r
$$;

revoke execute on function privado.rutas_fotos_de_trabajo(text[], uuid) from public;
grant execute on function privado.rutas_fotos_de_trabajo(text[], uuid) to anon, authenticated;

alter table public.trabajos
  add constraint trabajos_fotos_propias check (privado.rutas_fotos_de_trabajo(fotos, id));
