-- LAB-25 · Tests de la función `contactar_profesional` (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final: no deja datos.
--
-- Usuarios de prueba (prefijo cccccccc-1400):
--   C1 cliente con relaciones · CS cliente suspendido · C3 cliente para el límite diario
--   P1 profesional publicado · P2 profesional sin verificar · PS profesional suspendido
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema if not exists tests;

create or replace function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

create or replace function tests.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  set local role anon;
end;
$$;

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres, que saltea RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000001', 'authenticated', 'authenticated', 'ctc-c1@labia.test', '{"nombre": "Carla", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000002', 'authenticated', 'authenticated', 'ctc-cs@labia.test', '{"nombre": "Susana", "apellido": "Suspendida"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000003', 'authenticated', 'authenticated', 'ctc-c3@labia.test', '{"nombre": "Clara", "apellido": "Tres"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000004', 'authenticated', 'authenticated', 'ctc-p1@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Gómez"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000005', 'authenticated', 'authenticated', 'ctc-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1400-4000-a000-000000000006', 'authenticated', 'authenticated', 'ctc-ps@labia.test', '{"rol": "profesional", "nombre": "Sergio", "apellido": "Suspendido"}');

update public.usuarios u
set whatsapp = d.wa,
    barrio_id = (select b.id from public.barrios b where b.slug = 'centro')
from (values
  ('cccccccc-1400-4000-a000-000000000001', '+5492235550001'),
  ('cccccccc-1400-4000-a000-000000000002', '+5492235550002'),
  ('cccccccc-1400-4000-a000-000000000003', '+5492235550003'),
  ('cccccccc-1400-4000-a000-000000000004', '+5492235559999'),
  ('cccccccc-1400-4000-a000-000000000005', '+5492235558888'),
  ('cccccccc-1400-4000-a000-000000000006', '+5492235557777')
) as d (id, wa)
where u.id = d.id::uuid;

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok)
values
  ('cccccccc-1400-4000-a000-000000000004', '{plomeria}', true, true, true),
  ('cccccccc-1400-4000-a000-000000000005', '{plomeria}', true, false, false),
  ('cccccccc-1400-4000-a000-000000000006', '{plomeria}', true, true, true);

update public.usuarios set estado = 'suspendida' where id in ('cccccccc-1400-4000-a000-000000000002', 'cccccccc-1400-4000-a000-000000000006');

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, profesional_elegido_id)
values (
  'cccccccc-1400-4000-b000-000000000001', 'cccccccc-1400-4000-a000-000000000001', 'plomeria', 'Pérdida en el baño',
  'Descripción de prueba', (select b.id from public.barrios b where b.slug = 'centro'), 'sin_apuro',
  'asignado', 'cccccccc-1400-4000-a000-000000000004'
);

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
values (
  'cccccccc-1400-4000-b000-000000000002', 'cccccccc-1400-4000-a000-000000000001', 'plomeria', 'Canilla que gotea',
  'Descripción de prueba', (select b.id from public.barrios b where b.slug = 'centro'), 'sin_apuro', 'abierto'
);

insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
values
  ('cccccccc-1400-4000-b000-000000000001', 'cccccccc-1400-4000-a000-000000000004', 'Hecho', 'elegida'),
  ('cccccccc-1400-4000-b000-000000000001', 'cccccccc-1400-4000-a000-000000000005', 'Puedo ir', 'enviada'),
  ('cccccccc-1400-4000-b000-000000000002', 'cccccccc-1400-4000-a000-000000000004', 'Puedo ir', 'enviada');

-- C3 ya tiene 19 contactos de hoy y uno de hace dos días: el de hace dos días no cuenta para el límite.
insert into public.contactos (cliente_id, profesional_id, origen, created_at)
select 'cccccccc-1400-4000-a000-000000000003', 'cccccccc-1400-4000-a000-000000000004', 'perfil', now()
from generate_series(1, 19);

insert into public.contactos (cliente_id, profesional_id, origen, created_at)
values ('cccccccc-1400-4000-a000-000000000003', 'cccccccc-1400-4000-a000-000000000004', 'perfil', now() - interval '2 days');

-- ===========================================================================
-- Cliente activo
-- ===========================================================================

reset role; select tests.como('cccccccc-1400-4000-a000-000000000001');

select is(
  public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil'),
  '5492235559999',
  'cliente activo: recibe el WhatsApp del profesional en E.164 sin "+"'
);

select is(
  (select count(*) from public.contactos
   where cliente_id = 'cccccccc-1400-4000-a000-000000000001'
     and profesional_id = 'cccccccc-1400-4000-a000-000000000004'
     and origen = 'perfil' and trabajo_id is null),
  1::bigint,
  'cada contacto deja una fila en contactos'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'chat')$$,
  '23514', null, 'origen inválido: rechazado'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil', 'cccccccc-1400-4000-b000-000000000001')$$,
  '23514', null, 'origen perfil con trabajo: rechazado'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000005', 'perfil')$$,
  'P0002', null, 'profesional no publicado (sin verificar): no disponible'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000006', 'perfil')$$,
  'P0002', null, 'profesional con cuenta suspendida: no disponible'
);

-- Origen postulación: solo con el profesional elegido en un trabajo propio.
select is(
  public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'postulacion', 'cccccccc-1400-4000-b000-000000000001'),
  '5492235559999',
  'postulación elegida en trabajo propio: contacta'
);

select is(
  (select count(*) from public.contactos
   where cliente_id = 'cccccccc-1400-4000-a000-000000000001'
     and origen = 'postulacion' and trabajo_id = 'cccccccc-1400-4000-b000-000000000001'),
  1::bigint,
  'el contacto por postulación guarda el trabajo'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'postulacion', 'cccccccc-1400-4000-b000-000000000002')$$,
  '42501', null, 'postulación sin elegir en ese trabajo: sin permiso'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'postulacion')$$,
  '42501', null, 'origen postulación sin trabajo: sin permiso'
);

-- ===========================================================================
-- Quién no puede contactar
-- ===========================================================================

reset role; select tests.anonimo();
select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'anon: no contacta'
);

reset role; select tests.como('cccccccc-1400-4000-a000-000000000004');
select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'profesional: no contacta a otro profesional'
);

reset role; select tests.como('cccccccc-1400-4000-a000-000000000002');
select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'cliente suspendido: no contacta'
);

-- Nadie puede escribir contactos directo (la función es la única puerta).
reset role; select tests.como('cccccccc-1400-4000-a000-000000000001');
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1400-4000-a000-000000000001', 'cccccccc-1400-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'cliente: insert directo en contactos sigue prohibido'
);

-- ===========================================================================
-- Límite diario: 20 por cliente y por día (C3 ya tiene 19 de hoy)
-- ===========================================================================

reset role; select tests.como('cccccccc-1400-4000-a000-000000000003');
select is(
  public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil'),
  '5492235559999',
  'límite: el contacto número 20 de hoy todavía pasa (el de hace dos días no cuenta)'
);

select throws_ok(
  $$select public.contactar_profesional('cccccccc-1400-4000-a000-000000000004', 'perfil')$$,
  '53400', null, 'límite: el contacto número 21 de hoy se rechaza'
);

reset role;
select * from finish();

rollback;
