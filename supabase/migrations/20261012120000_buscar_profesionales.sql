-- LAB-22 · Búsqueda de profesionales por oficio, barrio y distancia.
--
-- Una sola función RPC `security invoker`: respeta RLS y los permisos por columna de LAB-12.
-- Lee `perfiles_profesionales` (solo publicados y de cuentas activas para anon, y además se
-- filtra `publicado` a mano porque un profesional ve su propio perfil sin publicar y un admin ve
-- todos), `usuarios_publicos` (nombre, inicial del apellido, barrio y foto: nunca whatsapp ni
-- apellido completo) y `barrios` (lectura pública).
--
-- La distancia es entre centros de barrio (guía §7.4), en km con una decimal. Nunca direcciones.
--
-- Zona: un profesional aparece si trabaja en toda la ciudad, si el barrio buscado está entre sus
-- zonas, o si su barrio queda a 6 km o menos del barrio buscado (para que los barrios chicos no
-- queden con listas vacías). `p_toda_la_ciudad = true` desactiva el filtro de zona.

create function public.buscar_profesionales(
  p_oficio public.oficio default null,
  p_barrio smallint default null,
  p_solo_matriculados boolean default false,
  p_orden text default 'cercania',
  p_toda_la_ciudad boolean default false,
  p_limite integer default 20,
  p_desde integer default 0
)
returns table (
  usuario_id uuid,
  nombre text,
  apellido_inicial text,
  foto_path text,
  oficios public.oficio[],
  anios_experiencia smallint,
  zonas_texto text,
  promedio numeric,
  cantidad_resenas integer,
  identidad_verificada boolean,
  antecedentes_ok boolean,
  matriculado boolean,
  distancia_km numeric,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with referencia as (
    select b.centro
    from public.barrios b
    where b.id = p_barrio
  ),
  candidatos as (
    select
      p.usuario_id,
      up.nombre,
      up.apellido_inicial,
      up.foto_path,
      p.oficios,
      p.anios_experiencia,
      p.toda_la_ciudad,
      p.zonas,
      p.promedio,
      p.cantidad_resenas,
      p.identidad_verificada,
      p.antecedentes_ok,
      p.matriculado,
      p.prioridad,
      round((extensions.st_distance(bp.centro, r.centro) / 1000)::numeric, 1) as distancia_km,
      count(*) over () as total
    from public.perfiles_profesionales p
    join public.usuarios_publicos up on up.id = p.usuario_id
    join public.barrios bp on bp.id = up.barrio_id
    cross join referencia r
    where p.publicado
      and (p_oficio is null or p_oficio = any (p.oficios))
      and (not p_solo_matriculados or p.matriculado)
      and (
        p_toda_la_ciudad
        or p.toda_la_ciudad
        or p_barrio = any (p.zonas)
        or extensions.st_dwithin(bp.centro, r.centro, 6000)
      )
  ),
  pagina as (
    select c.*
    from candidatos c
    order by
      -- `prioridad` está reservada para la suscripción post-MVP (USD 5, prioridad en búsquedas).
      -- Hoy vale 0 para todos, así que no cambia el orden. Mantenerla primera para que el día
      -- que se active no haga falta tocar la función.
      c.prioridad desc,
      case when p_orden = 'calificacion' then c.promedio end desc nulls last,
      case when p_orden = 'calificacion' then c.cantidad_resenas end desc,
      c.distancia_km asc,
      case when p_orden is distinct from 'calificacion' then c.promedio end desc nulls last,
      c.usuario_id
    limit greatest(least(coalesce(p_limite, 20), 100), 1)
    offset greatest(coalesce(p_desde, 0), 0)
  )
  select
    g.usuario_id,
    g.nombre,
    g.apellido_inicial,
    g.foto_path,
    g.oficios,
    g.anios_experiencia,
    case
      when g.toda_la_ciudad then 'Toda la ciudad'
      else z.texto
    end as zonas_texto,
    g.promedio,
    g.cantidad_resenas,
    g.identidad_verificada,
    g.antecedentes_ok,
    g.matriculado,
    g.distancia_km,
    g.total
  from pagina g
  left join lateral (
    select
      string_agg(s.nombre, ', ' order by s.orden) filter (where s.orden <= 3)
      || case
        when count(*) > 3 then ' y ' || (count(*) - 3)::text || ' más'
        else ''
      end as texto
    from (
      select zb.nombre, zo.orden
      from unnest(g.zonas) with ordinality as zo (id, orden)
      join public.barrios zb on zb.id = zo.id
    ) s
  ) z on true
  order by
    g.prioridad desc,
    case when p_orden = 'calificacion' then g.promedio end desc nulls last,
    case when p_orden = 'calificacion' then g.cantidad_resenas end desc,
    g.distancia_km asc,
    case when p_orden is distinct from 'calificacion' then g.promedio end desc nulls last,
    g.usuario_id
$$;

comment on function public.buscar_profesionales(public.oficio, smallint, boolean, text, boolean, integer, integer) is
  'LAB-22. Profesionales publicados de un oficio, por cercanía o calificación. No devuelve datos de contacto.';

-- Se puede llamar desde la API (anon y authenticated); RLS decide qué filas se ven.
revoke execute on function public.buscar_profesionales(public.oficio, smallint, boolean, text, boolean, integer, integer) from public;
grant execute on function public.buscar_profesionales(public.oficio, smallint, boolean, text, boolean, integer, integer) to anon, authenticated;
