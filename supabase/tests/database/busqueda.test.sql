-- LAB-22 · Tests de public.buscar_profesionales (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final: no deja datos.
--
-- Barrios usados (ids de la migración de barrios; la referencia de casi todas las búsquedas es Centro):
--   17 centro · 80 plaza-mitre (~0,3 km) · 51 la-perla (~1,4 km) · 78 playa-grande (~2,4 km)
--   84 punta-mogotes (~7 km: fuera del radio de 6 km) · 14 camet (~12 km) · 104 sierra-de-los-padres (~21 km)
--   20 chauvin · 107 varese · 105 stella-maris
--
-- Profesionales (nombre = letra; todos con barrio propio):
--   A plomería · plaza-mitre · zonas {plaza-mitre} · promedio 3,0 (5 reseñas)
--   B plomería · la-perla · zonas {la-perla} · promedio 5,0 (2 reseñas)
--   C plomería · playa-grande · toda la ciudad · matriculado · promedio 4,0 (10 reseñas)
--   D plomería · punta-mogotes · zonas {punta-mogotes, camet}
--   E plomería · camet · toda la ciudad · sin reseñas
--   F plomería · sierra-de-los-padres · zonas {sierra-de-los-padres}
--   G gas · chauvin · matriculado · zonas {chauvin, centro, la-perla, playa-grande, varese}
--   H gas · stella-maris · SIN matrícula (no se publica)
--   I plomería · plaza-mitre · toda la ciudad · suspendido (no se publica)
--   J electricidad · la-perla · zonas {la-perla}
--   K plomería · centro · toda la ciudad · verificación incompleta (no se publica)
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema tests;

create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

create function tests.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  set local role anon;
end;
$$;

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres, que saltea RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
select
  '00000000-0000-0000-0000-000000000000',
  ('cccccccc-2200-4000-a000-0000000000' || lpad(d.n::text, 2, '0'))::uuid,
  'authenticated',
  'authenticated',
  'busq-' || d.letra || '@labia.test',
  json_build_object('rol', d.rol, 'nombre', d.letra, 'apellido', 'Apellido' || d.letra)::jsonb
from (values
  (1, 'A', 'profesional'), (2, 'B', 'profesional'), (3, 'C', 'profesional'), (4, 'D', 'profesional'),
  (5, 'E', 'profesional'), (6, 'F', 'profesional'), (7, 'G', 'profesional'), (8, 'H', 'profesional'),
  (9, 'I', 'profesional'), (10, 'J', 'profesional'), (11, 'K', 'profesional'),
  (12, 'Cliente', 'cliente'), (13, 'Admin', 'cliente')
) as d (n, letra, rol);

update public.usuarios set rol = 'admin' where id = 'cccccccc-2200-4000-a000-00000000000d';

update public.usuarios u
set barrio_id = d.barrio, whatsapp = '+5492235550' || lpad(d.n::text, 3, '0')
from (values
  (1, 80), (2, 51), (3, 78), (4, 84), (5, 14), (6, 104), (7, 20), (8, 105), (9, 80), (10, 51), (11, 17), (12, 17), (13, 17)
) as d (n, barrio)
where u.id = ('cccccccc-2200-4000-a000-0000000000' || lpad(d.n::text, 2, '0'))::uuid;

insert into public.perfiles_profesionales
  (usuario_id, oficios, toda_la_ciudad, zonas, identidad_verificada, antecedentes_ok, matriculado)
select
  ('cccccccc-2200-4000-a000-0000000000' || lpad(d.n::text, 2, '0'))::uuid,
  d.oficios::public.oficio[], d.toda, d.zonas::smallint[], d.ident, true, d.matr
from (values
  (1,  '{plomeria}',     false, '{80}',                true, false),
  (2,  '{plomeria}',     false, '{51}',                true, false),
  (3,  '{plomeria}',     true,  '{}',                  true, true),
  (4,  '{plomeria}',     false, '{84,14}',             true, false),
  (5,  '{plomeria}',     true,  '{}',                  true, false),
  (6,  '{plomeria}',     false, '{104}',               true, false),
  (7,  '{gas}',          false, '{20,17,51,78,107}',   true, true),
  (8,  '{gas}',          false, '{105}',               true, false),
  (9,  '{plomeria}',     true,  '{}',                  true, false),
  (10, '{electricidad}', false, '{51}',                true, false),
  (11, '{plomeria}',     true,  '{}',                  false, false)
) as d (n, oficios, toda, zonas, ident, matr);

-- Promedios y cantidades (en producción los mantiene el trigger de reseñas).
update public.perfiles_profesionales set promedio = 3.0, cantidad_resenas = 5 where usuario_id = 'cccccccc-2200-4000-a000-000000000001';
update public.perfiles_profesionales set promedio = 5.0, cantidad_resenas = 2 where usuario_id = 'cccccccc-2200-4000-a000-000000000002';
update public.perfiles_profesionales set promedio = 4.0, cantidad_resenas = 10 where usuario_id = 'cccccccc-2200-4000-a000-000000000003';

-- Suspender a I después de publicarla: el trigger recalcula `publicado`.
update public.usuarios set estado = 'suspendida' where id = 'cccccccc-2200-4000-a000-000000000009';

-- ---------------------------------------------------------------------------
-- Premisas
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.perfiles_profesionales where publicado),
  8,
  'premisa: publicados A, B, C, D, E, F, G y J (H sin matrícula, I suspendido y K incompleto no)'
);

-- ---------------------------------------------------------------------------
-- Forma de la función
-- ---------------------------------------------------------------------------

select has_function('public', 'buscar_profesionales', 'existe public.buscar_profesionales');

select is(
  (select p.prosecdef from pg_proc p where p.proname = 'buscar_profesionales' and p.pronamespace = 'public'::regnamespace),
  false,
  'es security invoker: respeta RLS'
);

select ok(
  not exists (
    select 1
    from pg_proc p, unnest(p.proargnames) as n (nombre)
    where p.proname = 'buscar_profesionales'
      and p.pronamespace = 'public'::regnamespace
      and (n.nombre ilike '%whatsapp%' or n.nombre ilike '%email%' or n.nombre ilike '%telefono%' or n.nombre = 'apellido')
  ),
  'no devuelve whatsapp, email, teléfono ni apellido completo'
);

select ok(
  has_function_privilege('anon', 'public.buscar_profesionales(public.oficio, smallint, boolean, text, boolean, integer, integer)', 'execute')
  and has_function_privilege('authenticated', 'public.buscar_profesionales(public.oficio, smallint, boolean, text, boolean, integer, integer)', 'execute'),
  'anon y authenticated pueden ejecutarla'
);

-- ---------------------------------------------------------------------------
-- Como anónimo (la búsqueda es pública)
-- ---------------------------------------------------------------------------

select tests.anonimo();

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint)),
  array['A', 'B', 'C', 'E']::text[],
  'cercanía desde Centro: A (0,3 km), B, C y E (toda la ciudad); D queda a más de 6 km y sin zona; F y los no publicados no salen'
);

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_orden => 'calificacion')),
  array['B', 'C', 'A', 'E']::text[],
  'calificación: promedio desc (5,0; 4,0; 3,0) y sin reseñas al final'
);

select is(
  (select distancia_km from public.buscar_profesionales('plomeria', 17::smallint) where nombre = 'A'),
  public.distancia_km(80::smallint, 17::smallint),
  'la distancia es la de public.distancia_km entre centros de barrio'
);

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_toda_la_ciudad => true)),
  array['A', 'B', 'C', 'D', 'E', 'F']::text[],
  'p_toda_la_ciudad = true no filtra por zona: salen todos los plomeros publicados, del más cerca al más lejos'
);

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 84::smallint)),
  array['D', 'C', 'E']::text[],
  'desde Punta Mogotes: D (trabaja en ese barrio, 0 km), C y E (toda la ciudad); B y A no trabajan ahí ni están a 6 km'
);

select is(
  array(select nombre from public.buscar_profesionales(null, 17::smallint) order by distancia_km, nombre),
  array['A', 'G', 'B', 'J', 'C', 'E']::text[],
  'sin oficio (p_oficio = null) salen todos los oficios'
);

select is(
  array(select nombre from public.buscar_profesionales('gas', 17::smallint)),
  array['G']::text[],
  'gas: solo G; H (sin matrícula) no está publicado'
);

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_solo_matriculados => true)),
  array['C']::text[],
  'solo matriculados: C'
);

select is(
  array(select nombre from public.buscar_profesionales(null, 17::smallint, p_solo_matriculados => true) order by nombre),
  array['C', 'G']::text[],
  'solo matriculados sin oficio: C y G'
);

select is(
  array(select nombre from public.buscar_profesionales('electricidad', 17::smallint)),
  array['J']::text[],
  'electricidad: J (La Perla está a menos de 6 km de Centro)'
);

select is(
  (select count(*)::integer from public.buscar_profesionales('plomeria', 17::smallint) where nombre in ('H', 'I', 'K')),
  0,
  'un perfil no publicado o de cuenta suspendida nunca aparece'
);

-- zonas_texto
select is(
  (select zonas_texto from public.buscar_profesionales('plomeria', 17::smallint) where nombre = 'C'),
  'Toda la ciudad',
  'zonas_texto: toda la ciudad'
);

select is(
  (select zonas_texto from public.buscar_profesionales('plomeria', 17::smallint) where nombre = 'A'),
  'Plaza Mitre',
  'zonas_texto: una zona'
);

select is(
  (select zonas_texto from public.buscar_profesionales('gas', 17::smallint) where nombre = 'G'),
  'Chauvín, Centro, La Perla y 2 más',
  'zonas_texto: máximo 3 zonas y "y N más"'
);

-- Paginación
select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_limite => 2, p_desde => 0)),
  array['A', 'B']::text[],
  'paginación: primera página'
);

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_limite => 2, p_desde => 2)),
  array['C', 'E']::text[],
  'paginación: segunda página'
);

select is(
  (select min(total) from public.buscar_profesionales('plomeria', 17::smallint, p_limite => 2, p_desde => 2)),
  4::bigint,
  'total es el de toda la búsqueda, no el de la página'
);

select is(
  (select count(*)::integer from public.buscar_profesionales('plomeria', 17::smallint, p_limite => 1000)),
  4,
  'p_limite se acota (máximo 100) sin romper'
);

select is(
  (select count(*)::integer from public.buscar_profesionales('plomeria', 17::smallint, p_desde => 100)),
  0,
  'una página más allá del final devuelve vacío'
);

select is(
  (select count(*)::integer from public.buscar_profesionales('plomeria', 9999::smallint)),
  0,
  'un barrio inexistente no devuelve resultados'
);

-- Datos expuestos
select is(
  (select apellido_inicial from public.buscar_profesionales('plomeria', 17::smallint) where nombre = 'A'),
  'A',
  'solo la inicial del apellido'
);

-- ---------------------------------------------------------------------------
-- Como usuarios autenticados: la RLS no abre perfiles no publicados
-- ---------------------------------------------------------------------------

reset role;
select tests.como('cccccccc-2200-4000-a000-00000000000c');

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint)),
  array['A', 'B', 'C', 'E']::text[],
  'cliente: mismo resultado que anónimo'
);

reset role;
select tests.como('cccccccc-2200-4000-a000-000000000008');

select is(
  (select count(*)::integer from public.buscar_profesionales('gas', 105::smallint) where nombre = 'H'),
  0,
  'un profesional no se ve a sí mismo en la búsqueda si su perfil no está publicado'
);

reset role;
select tests.como('cccccccc-2200-4000-a000-00000000000b');

select is(
  (select count(*)::integer from public.buscar_profesionales('plomeria', 17::smallint) where nombre = 'K'),
  0,
  'un profesional con verificación incompleta no sale en su propia búsqueda'
);

reset role;
select tests.como('cccccccc-2200-4000-a000-00000000000d');

select is(
  array(select nombre from public.buscar_profesionales('plomeria', 17::smallint, p_toda_la_ciudad => true)),
  array['A', 'B', 'C', 'D', 'E', 'F']::text[],
  'admin: tampoco ve perfiles no publicados ni suspendidos'
);

select * from finish();

rollback;
