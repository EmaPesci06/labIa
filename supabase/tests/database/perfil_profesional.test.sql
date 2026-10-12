-- LAB-24 · Tests de public.perfil_profesional (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final: no deja datos.
--
--   P1 Martín Gómez       · gas + plomería · zonas {la-perla, centro} · publicado · whatsapp cargado
--   P2 Otro Profesional   · plomería · publicado (profesional ajeno que mira el perfil de P1)
--   P3 Sin Publicar       · plomería · verificación incompleta (no publicado)
--   P4 Suspendido Cuenta  · plomería · publicado, pero con la cuenta suspendida
--   C  Laura Fernández (cliente) · A  Admin Interno
--   Barrios: 17 centro · 51 la-perla
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
  ('cccccccc-2400-4000-a000-0000000000' || lpad(d.n::text, 2, '0'))::uuid,
  'authenticated',
  'authenticated',
  'perfil-' || d.n || '@labia.test',
  json_build_object('rol', d.rol, 'nombre', d.nombre, 'apellido', d.apellido)::jsonb
from (values
  (1, 'profesional', 'Martín', 'Gómez'),
  (2, 'profesional', 'Otro', 'Profesional'),
  (3, 'profesional', 'Sin', 'Publicar'),
  (4, 'profesional', 'Suspendido', 'Cuenta'),
  (5, 'cliente', 'Laura', 'Fernández'),
  (6, 'cliente', 'Admin', 'Interno')
) as d (n, rol, nombre, apellido);

-- Se descartan las cuentas del seed (también las borra el rollback).
delete from auth.users where email not like 'perfil-%';

update public.usuarios set rol = 'admin' where id = 'cccccccc-2400-4000-a000-000000000006';

update public.usuarios u
set barrio_id = d.barrio, whatsapp = '+5492235551' || lpad(d.n::text, 3, '0')
from (values (1, 51), (2, 17), (3, 17), (4, 17), (5, 17), (6, 17)) as d (n, barrio)
where u.id = ('cccccccc-2400-4000-a000-0000000000' || lpad(d.n::text, 2, '0'))::uuid;

insert into public.perfiles_profesionales
  (usuario_id, oficios, descripcion, anios_experiencia, toda_la_ciudad, zonas, disponibilidad,
   identidad_verificada, antecedentes_ok, matriculado, matricula_numero)
values
  ('cccccccc-2400-4000-a000-000000000001', '{gas,plomeria}', 'Gasista matriculado.', 12, false, '{51,17}', 'Lun a sáb, 8 a 18 h', true, true, true, 'MP-12345'),
  ('cccccccc-2400-4000-a000-000000000002', '{plomeria}', null, null, true, '{}', null, true, true, false, null),
  ('cccccccc-2400-4000-a000-000000000003', '{plomeria}', null, null, true, '{}', null, true, false, false, null),
  ('cccccccc-2400-4000-a000-000000000004', '{plomeria}', null, null, true, '{}', null, true, true, false, null);

update public.usuarios set estado = 'suspendida' where id = 'cccccccc-2400-4000-a000-000000000004';

-- ---------------------------------------------------------------------------
-- Premisas y forma de la función
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.perfiles_profesionales where publicado),
  2,
  'premisa: publicados P1 y P2 (P3 incompleto y P4 suspendido no)'
);

select has_function('public', 'perfil_profesional', array['uuid'], 'existe public.perfil_profesional(uuid)');

select ok(
  not exists (
    select 1
    from pg_proc p, unnest(p.proargnames) as n (nombre)
    where p.proname = 'perfil_profesional'
      and p.pronamespace = 'public'::regnamespace
      and (n.nombre ilike '%whatsapp%' or n.nombre ilike '%email%' or n.nombre ilike '%matricula_numero%' or n.nombre ilike '%dni%')
  ),
  'no devuelve whatsapp, email, número de matrícula ni DNI'
);

select ok(
  has_function_privilege('anon', 'public.perfil_profesional(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.perfil_profesional(uuid)', 'execute'),
  'anon y authenticated pueden ejecutarla'
);

-- ---------------------------------------------------------------------------
-- Anónimo: perfil publicado con la inicial del apellido
-- ---------------------------------------------------------------------------

select tests.anonimo();

select is(
  (select nombre || '|' || coalesce(apellido, 'NULO') || '|' || apellido_inicial
   from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  'Martín|NULO|G',
  'anónimo: nombre e inicial, apellido completo nulo'
);

select is(
  (select zonas_texto from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  'La Perla, Centro',
  'las zonas salen con el nombre del barrio y en el orden cargado'
);

select is(
  (select es_propio from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  false,
  'anónimo: es_propio = false'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000003')),
  0,
  'anónimo: un perfil sin publicar no devuelve filas'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000004')),
  0,
  'anónimo: un perfil con la cuenta suspendida no devuelve filas'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-0000000000ff')),
  0,
  'anónimo: un id inexistente no devuelve filas'
);

-- ---------------------------------------------------------------------------
-- Cliente: apellido completo
-- ---------------------------------------------------------------------------

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000005');

select is(
  (select apellido from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  'Gómez',
  'cliente: ve el apellido completo'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000003')),
  0,
  'cliente: no ve un perfil sin publicar'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000004')),
  0,
  'cliente: no ve un perfil con la cuenta suspendida'
);

-- ---------------------------------------------------------------------------
-- Profesional ajeno: solo la inicial
-- ---------------------------------------------------------------------------

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000002');

select is(
  (select coalesce(apellido, 'NULO') || '|' || apellido_inicial
   from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  'NULO|G',
  'profesional ajeno: apellido completo nulo, solo la inicial'
);

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000003')),
  0,
  'profesional ajeno: no ve un perfil sin publicar'
);

-- ---------------------------------------------------------------------------
-- Dueño: su propio perfil, publicado o no
-- ---------------------------------------------------------------------------

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000001');

select is(
  (select apellido || '|' || es_propio::text from public.perfil_profesional('cccccccc-2400-4000-a000-000000000001')),
  'Gómez|true',
  'dueño: apellido completo y es_propio = true'
);

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000003');

select is(
  (select publicado::text || '|' || apellido from public.perfil_profesional('cccccccc-2400-4000-a000-000000000003')),
  'false|Publicar',
  'dueño sin publicar: ve su propio perfil con el apellido completo'
);

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000004');

select is(
  (select count(*)::integer from public.perfil_profesional('cccccccc-2400-4000-a000-000000000004')),
  1,
  'dueño con la cuenta suspendida: sigue viendo su perfil'
);

-- ---------------------------------------------------------------------------
-- Admin: ve todo
-- ---------------------------------------------------------------------------

reset role;
select tests.como('cccccccc-2400-4000-a000-000000000006');

select is(
  (select count(*)::integer
   from unnest(array[
     'cccccccc-2400-4000-a000-000000000001', 'cccccccc-2400-4000-a000-000000000003',
     'cccccccc-2400-4000-a000-000000000004'
   ]::uuid[]) as i (id)
   cross join lateral public.perfil_profesional(i.id)),
  3,
  'admin: ve publicado, sin publicar y suspendido'
);

select is(
  (select apellido from public.perfil_profesional('cccccccc-2400-4000-a000-000000000003')),
  'Publicar',
  'admin: ve el apellido completo'
);

select * from finish();

rollback;
