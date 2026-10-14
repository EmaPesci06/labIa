-- LAB-33 · Borrado de cuenta (pgTAP). Correr con `pnpm db:test`.
-- Borrar `auth.users` (lo que hace `auth.admin.deleteUser`) no deja nada en `public` con ese id,
-- anonimiza las reseñas escritas y cancela los trabajos asignados al profesional.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- C1 cliente que se va · C2 cliente que se queda · P1 profesional que se va · P2 profesional que se queda
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3300-4000-a000-000000000001', 'authenticated', 'authenticated', 'borrar-c1@labia.test', '{"nombre": "Carla", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3300-4000-a000-000000000002', 'authenticated', 'authenticated', 'borrar-c2@labia.test', '{"nombre": "Carlos", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3300-4000-a000-000000000003', 'authenticated', 'authenticated', 'borrar-p1@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3300-4000-a000-000000000004', 'authenticated', 'authenticated', 'borrar-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Dos"}');

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok)
values
  ('cccccccc-3300-4000-a000-000000000003', '{plomeria}', true, true, true),
  ('cccccccc-3300-4000-a000-000000000004', '{plomeria}', true, true, true);

insert into public.verificaciones (usuario_id, tipo, storage_path)
values ('cccccccc-3300-4000-a000-000000000003', 'dni_frente', 'cccccccc-3300-4000-a000-000000000003/dni_frente-1791734400000.jpg');

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, profesional_elegido_id)
select t.id, t.cliente, 'plomeria', 'Canilla', 'Pierde agua', b.id, 'sin_apuro', t.estado::public.estado_trabajo, t.pro
from public.barrios b,
  (values
    ('dddddddd-3300-4000-a000-000000000001'::uuid, 'cccccccc-3300-4000-a000-000000000001'::uuid, 'abierto', null::uuid),
    ('dddddddd-3300-4000-a000-000000000002'::uuid, 'cccccccc-3300-4000-a000-000000000002'::uuid, 'asignado', 'cccccccc-3300-4000-a000-000000000003'::uuid),
    ('dddddddd-3300-4000-a000-000000000003'::uuid, 'cccccccc-3300-4000-a000-000000000002'::uuid, 'cerrado', 'cccccccc-3300-4000-a000-000000000003'::uuid)
  ) as t (id, cliente, estado, pro)
where b.slug = 'centro';

insert into public.postulaciones (trabajo_id, profesional_id, mensaje)
values
  ('dddddddd-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000003', 'Puedo ir mañana'),
  ('dddddddd-3300-4000-a000-000000000002', 'cccccccc-3300-4000-a000-000000000003', 'Puedo ir hoy');

insert into public.contactos (cliente_id, profesional_id, origen)
values
  ('cccccccc-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000004', 'perfil'),
  ('cccccccc-3300-4000-a000-000000000002', 'cccccccc-3300-4000-a000-000000000003', 'perfil');

-- C1 reseña a P2; C2 reseña a P1.
insert into public.resenas (autor_id, profesional_id, puntaje, texto)
values
  ('cccccccc-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000004', 5, 'Excelente'),
  ('cccccccc-3300-4000-a000-000000000002', 'cccccccc-3300-4000-a000-000000000003', 4, 'Muy bien');

insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo)
values ('cccccccc-3300-4000-a000-000000000001', 'perfil', 'cccccccc-3300-4000-a000-000000000004', 'otro');

select is(
  (select promedio from public.perfiles_profesionales where usuario_id = 'cccccccc-3300-4000-a000-000000000004'),
  5.0::numeric,
  'antes: P2 tiene promedio 5'
);

-- Se borra al cliente C1 y al profesional P1 (como hace la service role).
delete from auth.users where id in (
  'cccccccc-3300-4000-a000-000000000001',
  'cccccccc-3300-4000-a000-000000000003'
);

select is(
  (select count(*) from public.usuarios where id in ('cccccccc-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000003')),
  0::bigint, 'usuarios: no queda la fila de las cuentas borradas'
);
select is(
  (select count(*) from public.perfiles_profesionales where usuario_id = 'cccccccc-3300-4000-a000-000000000003'),
  0::bigint, 'perfil profesional: se borra'
);
select is(
  (select count(*) from public.verificaciones where usuario_id = 'cccccccc-3300-4000-a000-000000000003'),
  0::bigint, 'verificaciones: se borran'
);
select is(
  (select count(*) from public.trabajos where cliente_id = 'cccccccc-3300-4000-a000-000000000001'),
  0::bigint, 'trabajos del cliente: se borran'
);
select is(
  (select count(*) from public.postulaciones where profesional_id = 'cccccccc-3300-4000-a000-000000000003'
     or trabajo_id = 'dddddddd-3300-4000-a000-000000000001'),
  0::bigint, 'postulaciones: se borran las del profesional y las de trabajos del cliente'
);
select is(
  (select count(*) from public.contactos
    where cliente_id in ('cccccccc-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000003')
       or profesional_id in ('cccccccc-3300-4000-a000-000000000001', 'cccccccc-3300-4000-a000-000000000003')),
  0::bigint, 'contactos: se borran los de ambos lados'
);
select is(
  (select count(*) from public.resenas where profesional_id = 'cccccccc-3300-4000-a000-000000000003'),
  0::bigint, 'reseñas recibidas: se borran con el perfil'
);
select is(
  (select count(*) from public.resenas where profesional_id = 'cccccccc-3300-4000-a000-000000000004' and autor_id is null),
  1::bigint, 'reseñas escritas: quedan anónimas (autor_id null)'
);
select is(
  (select promedio from public.perfiles_profesionales where usuario_id = 'cccccccc-3300-4000-a000-000000000004'),
  5.0::numeric, 'el promedio del profesional no cambia'
);
select is(
  (select count(*) from public.reportes where autor_id = 'cccccccc-3300-4000-a000-000000000001'),
  0::bigint, 'reportes: no queda el autor'
);
select is(
  (select count(*) from public.reportes where objetivo_id = 'cccccccc-3300-4000-a000-000000000004' and autor_id is null),
  1::bigint, 'reportes: el reporte se conserva para moderación'
);
select is(
  (select estado::text from public.trabajos where id = 'dddddddd-3300-4000-a000-000000000002'),
  'cancelado', 'trabajo asignado al profesional borrado: se cancela'
);
select is(
  (select estado::text from public.trabajos where id = 'dddddddd-3300-4000-a000-000000000003'),
  'cerrado', 'trabajo ya cerrado: no cambia'
);
select is(
  (select count(*) from public.usuarios where id in ('cccccccc-3300-4000-a000-000000000002', 'cccccccc-3300-4000-a000-000000000004')),
  2::bigint, 'las otras cuentas siguen'
);

-- acciones_moderacion: sin datos personales y solo la lee un admin.
insert into public.acciones_moderacion (accion, objetivo_id)
values ('cuenta_borrada', 'cccccccc-3300-4000-a000-000000000001');

select is(
  (select count(*) from public.acciones_moderacion where accion = 'cuenta_borrada'),
  1::bigint, 'acciones_moderacion: se registra solo accion y objetivo_id'
);

create schema tests;
create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

select tests.como('cccccccc-3300-4000-a000-000000000002');
select is(
  (select count(*) from public.acciones_moderacion),
  0::bigint, 'acciones_moderacion: un cliente no ve nada'
);
select throws_ok(
  $$insert into public.acciones_moderacion (accion) values ('x')$$,
  '42501', null, 'acciones_moderacion: nadie inserta por la API'
);
reset role;

select * from finish();
rollback;
