-- LAB-18 · Las rutas de fotos del perfil tienen que estar en la carpeta del propio usuario.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1800-4000-a000-000000000001', 'authenticated', 'authenticated', 'fotos-p1@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1800-4000-a000-000000000002', 'authenticated', 'authenticated', 'fotos-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Dos"}');

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad)
values ('cccccccc-1800-4000-a000-000000000001', '{plomeria}', true);

create schema tests;
create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

select tests.como('cccccccc-1800-4000-a000-000000000001');

select lives_ok(
  $$update public.usuarios set foto_path = 'perfiles/cccccccc-1800-4000-a000-000000000001/1791734400000.jpg' where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  'foto_path: acepta una ruta de su carpeta'
);
select lives_ok(
  $$update public.usuarios set foto_path = null where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  'foto_path: acepta null'
);
select throws_ok(
  $$update public.usuarios set foto_path = 'perfiles/cccccccc-1800-4000-a000-000000000002/1.jpg' where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'foto_path: rechaza la carpeta de otra persona'
);
select throws_ok(
  $$update public.usuarios set foto_path = 'https://malo.example/x.jpg' where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'foto_path: rechaza una URL'
);
select throws_ok(
  $$update public.usuarios set foto_path = 'perfiles/cccccccc-1800-4000-a000-000000000001/../x.jpg' where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'foto_path: rechaza ..'
);
select throws_ok(
  $$update public.usuarios set foto_path = 'trabajos-hechos/cccccccc-1800-4000-a000-000000000001/1.jpg' where id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'foto_path: rechaza la carpeta de trabajos'
);

select lives_ok(
  $$update public.perfiles_profesionales set fotos_trabajos = array['trabajos-hechos/cccccccc-1800-4000-a000-000000000001/1-0.jpg', 'trabajos-hechos/cccccccc-1800-4000-a000-000000000001/1-1.webp'] where usuario_id = 'cccccccc-1800-4000-a000-000000000001'$$,
  'fotos_trabajos: acepta rutas de su carpeta'
);
select lives_ok(
  $$update public.perfiles_profesionales set fotos_trabajos = '{}' where usuario_id = 'cccccccc-1800-4000-a000-000000000001'$$,
  'fotos_trabajos: acepta una lista vacía'
);
select throws_ok(
  $$update public.perfiles_profesionales set fotos_trabajos = array['trabajos-hechos/cccccccc-1800-4000-a000-000000000001/1.jpg', 'trabajos-hechos/cccccccc-1800-4000-a000-000000000002/1.jpg'] where usuario_id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'fotos_trabajos: un solo elemento ajeno rechaza toda la lista'
);
select throws_ok(
  $$update public.perfiles_profesionales set fotos_trabajos = array['cualquier cosa'] where usuario_id = 'cccccccc-1800-4000-a000-000000000001'$$,
  '23514', null, 'fotos_trabajos: rechaza texto libre'
);

reset role;
select * from finish();

rollback;
