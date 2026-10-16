-- LAB-26 · Las fotos de un trabajo tienen que estar en la carpeta de ese trabajo.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-2600-4000-a000-000000000001', 'authenticated', 'authenticated', 'ft-c1@labia.test', '{"rol": "cliente", "nombre": "Clara"}');

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia)
values
  ('dddddddd-2600-4000-a000-000000000001', 'cccccccc-2600-4000-a000-000000000001', 'gas', 'Olor a gas', 'Desde ayer hay olor a gas', 17, 'lo_antes_posible'),
  ('dddddddd-2600-4000-a000-000000000002', 'cccccccc-2600-4000-a000-000000000001', 'gas', 'Otro trabajo', 'Otra descripción del trabajo', 17, 'sin_apuro');

create schema tests;
create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

select tests.como('cccccccc-2600-4000-a000-000000000001');

-- Mismo formato que genera el navegador: <cliente>/<trabajo>/<índice>-<Date.now()>.jpg (LAB-52)
select lives_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/0-1791734400000.jpg', 'cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/1-1791734400001.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  'acepta rutas de la carpeta del trabajo'
);
select lives_ok(
  $$update public.trabajos set fotos = '{}' where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  'acepta una lista vacía'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000002/0-1.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza la carpeta de otro trabajo'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/0-1.jpg', 'cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000002/0-1.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'un solo elemento ajeno rechaza toda la lista'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000002/dddddddd-2600-4000-a000-000000000001/0-1.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza la carpeta de otro cliente, aunque sea el mismo trabajo'
);
select throws_ok(
  $$update public.trabajos set fotos = array['https://malo.example/x.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza una URL'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/../x.jpg'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza ..'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/x.gif'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza extensiones no permitidas'
);
select throws_ok(
  $$update public.trabajos set fotos = array['cualquier cosa'] where id = 'dddddddd-2600-4000-a000-000000000001'$$,
  '23514', null, 'rechaza texto libre'
);
select throws_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, fotos) values ('cccccccc-2600-4000-a000-000000000001', 'gas', 'Con foto ajena', 'Una descripción cualquiera', 17, 'sin_apuro', array['cccccccc-2600-4000-a000-000000000001/dddddddd-2600-4000-a000-000000000001/0-1.jpg'])$$,
  '23514', null, 'al crear, las fotos no pueden apuntar a la carpeta de otro trabajo'
);

reset role;
select * from finish();

rollback;
