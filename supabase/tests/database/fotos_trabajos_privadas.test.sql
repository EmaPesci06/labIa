-- LAB-52 · Las fotos de trabajos son privadas: quién las lee, sube y borra, y cuándo se programa el
-- borrado. Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-2700-4000-a000-000000000001', 'authenticated', 'authenticated', 'fp-c1@labia.test', '{"rol": "cliente", "nombre": "Clara"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-2700-4000-a000-000000000002', 'authenticated', 'authenticated', 'fp-c2@labia.test', '{"rol": "cliente", "nombre": "Carlos"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-2700-4000-a000-000000000003', 'authenticated', 'authenticated', 'fp-p1@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-2700-4000-a000-000000000004', 'authenticated', 'authenticated', 'fp-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Dos"}');

-- P1 verificado y publicado (ve los trabajos abiertos); P2 todavía en revisión.
insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values
  ('cccccccc-2700-4000-a000-000000000003', '{gas}', true, true, true, true),
  ('cccccccc-2700-4000-a000-000000000004', '{gas}', true, false, false, false);

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, fotos)
values
  ('dddddddd-2700-4000-a000-000000000001', 'cccccccc-2700-4000-a000-000000000001', 'gas', 'Olor a gas', 'Desde ayer hay olor a gas', 17, 'lo_antes_posible', array['cccccccc-2700-4000-a000-000000000001/dddddddd-2700-4000-a000-000000000001/0-1791734400000.jpg']),
  ('dddddddd-2700-4000-a000-000000000002', 'cccccccc-2700-4000-a000-000000000001', 'gas', 'Otro trabajo', 'Otra descripción del trabajo', 17, 'sin_apuro', '{}');

insert into storage.objects (bucket_id, name)
values ('fotos-trabajos', 'cccccccc-2700-4000-a000-000000000001/dddddddd-2700-4000-a000-000000000001/0-1791734400000.jpg');

create schema tests;

grant usage on schema tests to anon, authenticated;

create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create function tests.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
end;
$$;

-- Dueño (cliente 1)
select tests.como('cccccccc-2700-4000-a000-000000000001');

select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  1::bigint,
  'dueño: ve la foto de su trabajo'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos-trabajos', 'cccccccc-2700-4000-a000-000000000001/dddddddd-2700-4000-a000-000000000001/1-1791734400001.jpg')$$,
  'dueño: sube a la carpeta de su trabajo'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos-trabajos', 'cccccccc-2700-4000-a000-000000000002/dddddddd-2700-4000-a000-000000000001/0-1.jpg')$$,
  '42501', null, 'dueño: no sube a la carpeta de otro cliente'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos-trabajos', 'cccccccc-2700-4000-a000-000000000001/dddddddd-2700-4000-a000-000000000001/0-1.gif')$$,
  '42501', null, 'dueño: no sube un archivo que no es imagen permitida'
);
select throws_ok(
  $$update public.trabajos set fotos_borrar_despues_de = now() where id = 'dddddddd-2700-4000-a000-000000000001'$$,
  '42501', null, 'dueño: no escribe la fecha de borrado desde la API'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  2::bigint,
  'dueño: ve sus dos fotos'
);

-- Profesional verificado con el trabajo abierto
select tests.como('cccccccc-2700-4000-a000-000000000003');
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  2::bigint,
  'profesional verificado: ve las fotos de un trabajo abierto'
);

-- Profesional sin verificar
select tests.como('cccccccc-2700-4000-a000-000000000004');
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  0::bigint,
  'profesional sin verificar: no ve las fotos'
);

-- Otro cliente: no ve y no borra
select tests.como('cccccccc-2700-4000-a000-000000000002');
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  0::bigint,
  'otro cliente: no ve las fotos ajenas'
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'fotos-trabajos' and name like 'cccccccc-2700-4000-a000-000000000001/%'$$,
  'otro cliente: intentar borrar no falla (no encuentra nada)'
);

reset role;

select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  2::bigint,
  'otro cliente: no borró las fotos ajenas'
);

-- Anon
select tests.anonimo();
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  0::bigint,
  'anon: no ve ninguna foto de trabajo'
);

-- Dueño quita una foto propia (lo que hace cancelar un trabajo)
select tests.como('cccccccc-2700-4000-a000-000000000001');
select lives_ok(
  $$delete from storage.objects where bucket_id = 'fotos-trabajos' and name = 'cccccccc-2700-4000-a000-000000000001/dddddddd-2700-4000-a000-000000000001/1-1791734400001.jpg'$$,
  'dueño: quita una de sus fotos'
);

reset role;

select is(
  (select count(*) from storage.objects where bucket_id = 'fotos-trabajos'),
  1::bigint,
  'dueño: la foto quitada no queda y la otra sigue'
);

-- Programación del borrado según el estado (trigger)
select ok(
  coalesce(
    (select fotos_borrar_despues_de <= now() + interval '1 minute' from public.trabajos where id = 'dddddddd-2700-4000-a000-000000000001'),
    false
  ),
  'cancelar: programa el borrado de inmediato'
);
select lives_ok(
  $$update public.trabajos set estado = 'abierto' where id = 'dddddddd-2700-4000-a000-000000000001'$$,
  'reabrir un trabajo cancelado (como cambiar de profesional)'
);
select is(
  (select fotos_borrar_despues_de from public.trabajos where id = 'dddddddd-2700-4000-a000-000000000001'),
  null::timestamptz,
  'reabrir: quita el borrado programado'
);
select lives_ok(
  $$update public.trabajos set estado = 'cerrado' where id = 'dddddddd-2700-4000-a000-000000000002'$$,
  'terminar un trabajo'
);
select ok(
  coalesce(
    (select fotos_borrar_despues_de between now() + interval '29 days' and now() + interval '31 days' from public.trabajos where id = 'dddddddd-2700-4000-a000-000000000002'),
    false
  ),
  'terminado: programa el borrado a los 30 días'
);

select * from finish();

rollback;
