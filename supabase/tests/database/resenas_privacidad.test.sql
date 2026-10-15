-- LAB-56 · Reseñas: privacidad y edición (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create schema tests;
grant usage on schema tests to authenticated;

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

-- ---------------------------------------------------------------------------
-- Preparación: C (cliente activo), S (cliente suspendido), P (profesional publicado)
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-5600-4000-a000-000000000001', 'authenticated', 'authenticated', 'rp-c@labia.test', '{"nombre": "Carla", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-5600-4000-a000-000000000002', 'authenticated', 'authenticated', 'rp-s@labia.test', '{"nombre": "Sergio", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-5600-4000-a000-000000000003', 'authenticated', 'authenticated', 'rp-p@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "Pro"}');

update public.usuarios set estado = 'suspendida' where id = 'dddddddd-5600-4000-a000-000000000002';

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values ('dddddddd-5600-4000-a000-000000000003', '{plomeria}', true, true, true, true);

-- R1: de C (activo). R2: de S (suspendido), creada hace un momento: dentro de las 24 h.
insert into public.resenas (id, autor_id, profesional_id, puntaje, texto)
values
  ('dddddddd-5600-4000-a000-0000000000a1', 'dddddddd-5600-4000-a000-000000000001', 'dddddddd-5600-4000-a000-000000000003', 5, 'Muy buen trabajo'),
  ('dddddddd-5600-4000-a000-0000000000a2', 'dddddddd-5600-4000-a000-000000000002', 'dddddddd-5600-4000-a000-000000000003', 4, 'Puntual');

-- ---------------------------------------------------------------------------
-- 1. Privilegios y columnas (como dueño de la base)
-- ---------------------------------------------------------------------------

select ok(
  not has_table_privilege('anon', 'public.resenas', 'select'),
  'anon no tiene select sobre la tabla resenas'
);

select ok(
  has_table_privilege('anon', 'public.resenas_publicas', 'select'),
  'anon tiene select sobre la vista resenas_publicas'
);

select hasnt_column('public', 'resenas_publicas', 'autor_id', 'la vista resenas_publicas no tiene autor_id');

select hasnt_column('public', 'resenas_publicas', 'trabajo_id', 'la vista resenas_publicas no tiene trabajo_id');

select ok(
  not has_function_privilege('authenticated', 'privado.objetivo_existe(text, uuid)', 'execute'),
  'authenticated no puede ejecutar privado.objetivo_existe'
);

-- ---------------------------------------------------------------------------
-- 2. anon: la tabla no se lee; la vista sí, sin ids
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select id from public.resenas$$,
  '42501',
  'permission denied for table resenas',
  'anon no lee la tabla resenas'
);

select is(
  (select count(*)::int from public.resenas_publicas where profesional_id = 'dddddddd-5600-4000-a000-000000000003'),
  2,
  'anon lee las reseñas del profesional por la vista'
);

select is(
  (select autor_nombre from public.resenas_publicas where id = 'dddddddd-5600-4000-a000-0000000000a1'),
  'Carla',
  'la vista trae el nombre visible del autor'
);

select is(
  (select autor_inicial from public.resenas_publicas where id = 'dddddddd-5600-4000-a000-0000000000a1'),
  'U',
  'la vista trae solo la inicial del apellido del autor'
);

select throws_ok(
  $$select autor_id from public.resenas_publicas$$,
  '42703',
  'column "autor_id" does not exist',
  'anon no puede pedir autor_id por la vista'
);

-- ---------------------------------------------------------------------------
-- 3. B-07: el suspendido no edita; el activo sí (dentro de 24 h)
-- ---------------------------------------------------------------------------

reset role;
select tests.como('dddddddd-5600-4000-a000-000000000002');

select is(
  (with u as (update public.resenas set texto = 'Cambiada' where id = 'dddddddd-5600-4000-a000-0000000000a2' returning id) select count(*)::int from u),
  0,
  'un cliente suspendido no edita su reseña'
);

select tests.como('dddddddd-5600-4000-a000-000000000001');

select is(
  (with u as (update public.resenas set texto = 'Editada' where id = 'dddddddd-5600-4000-a000-0000000000a1' returning id) select count(*)::int from u),
  1,
  'un cliente activo edita su reseña dentro de 24 h'
);

reset role;

select is(
  (select texto from public.resenas where id = 'dddddddd-5600-4000-a000-0000000000a2'),
  'Puntual',
  'el texto de la reseña del suspendido no cambió'
);

select is(
  (select texto from public.resenas where id = 'dddddddd-5600-4000-a000-0000000000a1'),
  'Editada',
  'el texto de la reseña del cliente activo sí cambió'
);

-- ---------------------------------------------------------------------------
-- 4. B-06: reportar sigue funcionando sin poder sondear objetivo_existe
-- ---------------------------------------------------------------------------

select tests.como('dddddddd-5600-4000-a000-000000000001');

select throws_ok(
  $$select privado.objetivo_existe('resena', 'dddddddd-5600-4000-a000-0000000000a2'::uuid)$$,
  '42501',
  'permission denied for function objetivo_existe',
  'authenticated no puede sondear privado.objetivo_existe'
);

select lives_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('dddddddd-5600-4000-a000-000000000001', 'resena', 'dddddddd-5600-4000-a000-0000000000a2', 'otro')$$,
  'un cliente activo puede reportar una reseña ajena'
);

select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('dddddddd-5600-4000-a000-000000000001', 'resena', 'dddddddd-5600-4000-a000-0000000000a1', 'otro')$$,
  '23514',
  null,
  'no se puede reportar la propia reseña'
);

select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
    values ('dddddddd-5600-4000-a000-000000000001', 'resena', 'dddddddd-5600-4000-a000-00000000ffff', 'otro')$$,
  'P0002',
  null,
  'no se puede reportar una reseña que no existe'
);

reset role;

select * from finish();

rollback;
