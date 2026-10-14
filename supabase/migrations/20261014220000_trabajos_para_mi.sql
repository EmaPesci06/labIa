-- LAB-27 · Lista de trabajos para profesionales y función public.trabajos_para_mi.
--
--   · Columna `cantidad_postulaciones`: guardada en `trabajos` y mantenida por trigger desde
--     `postulaciones` (las no retiradas). Así los profesionales saben cuántos se postularon sin
--     saltarse la RLS que les impide leer postulaciones ajenas.
--   · Política `trabajos_leer_postulado`: un profesional puede seguir leyendo los trabajos a los
--     que se postuló aunque ya no estén abiertos (por ejemplo, asignados a otro o cerrados).
--   · Vista `usuarios_publicos`: se amplía para que el profesional vea el nombre e inicial del
--     cliente de trabajos a los que se postuló o de trabajos abiertos (incluso en revisión).
--   · Función `public.trabajos_para_mi`: busca trabajos abiertos que coincidan con los oficios
--     del profesional autenticado, calcula la distancia entre centros de barrio, filtra por zonas
--     si corresponde, y ordena urgentes de las últimas 24 h primero, luego por novedad y distancia.

-- ---------------------------------------------------------------------------
-- 1. Columna cantidad_postulaciones y trigger
-- ---------------------------------------------------------------------------

alter table public.trabajos
  add column if not exists cantidad_postulaciones integer not null default 0
  check (cantidad_postulaciones >= 0);

update public.trabajos t
set cantidad_postulaciones = coalesce(
  (
    select count(*)::integer
    from public.postulaciones po
    where po.trabajo_id = t.id and po.estado <> 'retirada'
  ),
  0
);

create or replace function privado.actualizar_cantidad_postulaciones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo_id uuid;
begin
  v_trabajo_id := coalesce(new.trabajo_id, old.trabajo_id);
  if v_trabajo_id is not null then
    update public.trabajos
    set cantidad_postulaciones = (
      select count(*)::integer
      from public.postulaciones po
      where po.trabajo_id = v_trabajo_id
        and po.estado <> 'retirada'
    )
    where id = v_trabajo_id;
  end if;
  return coalesce(new, old);
end;
$$;

revoke execute on function privado.actualizar_cantidad_postulaciones() from public, anon, authenticated;

drop trigger if exists postulaciones_actualizar_cantidad on public.postulaciones;
create trigger postulaciones_actualizar_cantidad
after insert or update of estado, trabajo_id or delete on public.postulaciones
for each row execute function privado.actualizar_cantidad_postulaciones();

-- ---------------------------------------------------------------------------
-- 2. Política de lectura para postulantes
-- ---------------------------------------------------------------------------

drop policy if exists trabajos_leer_postulado on public.trabajos;
create policy trabajos_leer_postulado on public.trabajos
  for select to authenticated
  using (
    privado.cuenta_activa()
    and exists (
      select 1 from public.postulaciones po
      where po.trabajo_id = public.trabajos.id
        and po.profesional_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Vista usuarios_publicos actualizada con relación de postulación
-- ---------------------------------------------------------------------------

create or replace view public.usuarios_publicos as
select
  x.id,
  x.nombre,
  left(x.apellido, 1) as apellido_inicial,
  case when x.con_relacion then x.barrio_id end as barrio_id,
  x.foto_path
from (
  select
    u.id,
    u.nombre,
    u.apellido,
    u.barrio_id,
    u.foto_path,
    (
      u.id = (select auth.uid())
      or privado.perfil_publicado(u.id)
      or exists (
        select 1 from public.trabajos t
        where t.cliente_id = u.id
          and (
            (
              t.estado = 'abierto'
              and privado.rol_actual() = 'profesional'
              and privado.cuenta_activa()
            )
            or t.profesional_elegido_id = (select auth.uid())
          )
      )
      or exists (
        select 1
        from public.postulaciones po
        join public.trabajos t on t.id = po.trabajo_id
        where (
          (po.profesional_id = u.id and t.cliente_id = (select auth.uid()))
          or (po.profesional_id = (select auth.uid()) and t.cliente_id = u.id)
        )
      )
    ) as con_relacion,
    exists (select 1 from public.resenas r where r.autor_id = u.id) as es_autor_de_resena
  from public.usuarios u
  where u.estado = 'activa'
) x
where x.con_relacion or x.es_autor_de_resena;

-- ---------------------------------------------------------------------------
-- 4. Función trabajos_para_mi
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
  if v_uid is null or not privado.cuenta_activa() or privado.rol_actual() <> 'profesional' then
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
