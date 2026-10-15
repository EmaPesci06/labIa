-- LAB-29 · Tests de las funciones de gestión de postulantes y trabajos (pgTAP).
--   · elegir_postulante (atómico, security definer)
--   · cambiar_profesional
--   · marcar_trabajo_terminado
--   · cancelar_trabajo

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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
-- Datos de prueba
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'lab29-c1@labia.test', '{"nombre": "Cliente", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'lab29-c2@labia.test', '{"nombre": "Cliente", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'lab29-p1@labia.test', '{"rol": "profesional", "nombre": "Plomero", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', '29000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'lab29-p2@labia.test', '{"rol": "profesional", "nombre": "Plomero", "apellido": "Dos"}');

update public.usuarios u
set barrio_id = (select b.id from public.barrios b where b.slug = 'centro')
where u.id in (
  '29000000-0000-4000-a000-000000000001',
  '29000000-0000-4000-a000-000000000002',
  '29000000-0000-4000-a000-000000000003',
  '29000000-0000-4000-a000-000000000004'
);

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok)
values
  ('29000000-0000-4000-a000-000000000003', array['plomeria'::public.oficio], true, true, true),
  ('29000000-0000-4000-a000-000000000004', array['plomeria'::public.oficio], true, true, true);

-- Trabajo T1 de C1
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
values (
  '29000000-0000-4000-b000-000000000001',
  '29000000-0000-4000-a000-000000000001',
  'plomeria',
  'Reparar canilla',
  'Gotea la canilla de la cocina.',
  (select id from public.barrios where slug = 'centro'),
  'lo_antes_posible',
  'abierto'
);

-- Postulaciones PO1 (P1) y PO2 (P2) en T1
insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, precio_estimado, sena_propuesta, estado)
values
  ('29000000-0000-4000-c000-000000000001', '29000000-0000-4000-b000-000000000001', '29000000-0000-4000-a000-000000000003', 'Puedo ir hoy a las 15 hs.', 20000, 5000, 'enviada'),
  ('29000000-0000-4000-c000-000000000002', '29000000-0000-4000-b000-000000000001', '29000000-0000-4000-a000-000000000004', 'Tengo disponibilidad mañana.', 18000, 4000, 'enviada');

-- ---------------------------------------------------------------------------
-- 1. Permisos y autorización
-- ---------------------------------------------------------------------------

reset role; select tests.anonimo();
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000001')$$,
  '42501',
  null,
  'anon no puede llamar a elegir_postulante'
);

reset role; select tests.como('29000000-0000-4000-a000-000000000003'); -- P1 profesional
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000001')$$,
  '42501',
  null,
  'un profesional no puede llamar a elegir_postulante'
);

reset role; select tests.como('29000000-0000-4000-a000-000000000002'); -- C2 cliente ajeno
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000001')$$,
  '42501',
  'El trabajo no te pertenece',
  'un cliente ajeno no puede elegir postulantes en un trabajo que no es suyo'
);

-- ---------------------------------------------------------------------------
-- 2. Elección exitosa (atómica)
-- ---------------------------------------------------------------------------

reset role; select tests.como('29000000-0000-4000-a000-000000000001'); -- C1 dueño
select is(
  public.elegir_postulante('29000000-0000-4000-c000-000000000001'),
  '29000000-0000-4000-a000-000000000003'::uuid,
  'elegir_postulante devuelve el id del profesional elegido'
);

select is(
  (select estado::text from public.trabajos where id = '29000000-0000-4000-b000-000000000001'),
  'asignado',
  'el trabajo pasa a estado asignado'
);

select is(
  (select profesional_elegido_id from public.trabajos where id = '29000000-0000-4000-b000-000000000001'),
  '29000000-0000-4000-a000-000000000003'::uuid,
  'el trabajo tiene asignado al profesional P1'
);

select is(
  (select estado::text from public.postulaciones where id = '29000000-0000-4000-c000-000000000001'),
  'elegida',
  'la postulación elegida queda en estado elegida'
);

select is(
  (select estado::text from public.postulaciones where id = '29000000-0000-4000-c000-000000000002'),
  'descartada',
  'la otra postulación pasa a estado descartada'
);

-- Intentar elegir otra vez en trabajo ya asignado falla (atomicidad)
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000002')$$,
  '22023',
  'El trabajo ya no está abierto',
  'no se puede elegir otro postulante si el trabajo ya no está abierto'
);

-- ---------------------------------------------------------------------------
-- 3. Cambiar de profesional
-- ---------------------------------------------------------------------------

reset role; select tests.como('29000000-0000-4000-a000-000000000002'); -- C2
select throws_ok(
  $$select public.cambiar_profesional('29000000-0000-4000-b000-000000000001')$$,
  '42501',
  'El trabajo no te pertenece',
  'un cliente ajeno no puede cambiar de profesional'
);

reset role; select tests.como('29000000-0000-4000-a000-000000000001'); -- C1
select is(
  public.cambiar_profesional('29000000-0000-4000-b000-000000000001'),
  true,
  'cambiar_profesional devuelve true'
);

select is(
  (select estado::text from public.trabajos where id = '29000000-0000-4000-b000-000000000001'),
  'abierto',
  'tras cambiar_profesional el trabajo vuelve a abierto'
);

select is(
  (select estado::text from public.postulaciones where id = '29000000-0000-4000-c000-000000000001'),
  'descartada',
  'la postulación anteriormente elegida queda como descartada'
);

select is(
  (select estado::text from public.postulaciones where id = '29000000-0000-4000-c000-000000000002'),
  'enviada',
  'la otra postulación vuelve a estar enviada'
);

-- ---------------------------------------------------------------------------
-- 4. Marcar terminado
-- ---------------------------------------------------------------------------

-- Primero re-elegimos P2
select public.elegir_postulante('29000000-0000-4000-c000-000000000002');

select is(
  public.marcar_trabajo_terminado('29000000-0000-4000-b000-000000000001'),
  true,
  'marcar_trabajo_terminado pasa el trabajo a cerrado'
);

-- ---------------------------------------------------------------------------
-- 5. El elegido tiene que seguir activo y con perfil publicado (LAB-44)
-- ---------------------------------------------------------------------------

reset role;
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
values (
  '29000000-0000-4000-b000-000000000002',
  '29000000-0000-4000-a000-000000000001',
  'plomeria',
  'Destapar desagüe',
  'El desagüe del baño no traga.',
  (select id from public.barrios where slug = 'centro'),
  'sin_apuro',
  'abierto'
);
insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, precio_estimado, estado)
values (
  '29000000-0000-4000-c000-000000000003',
  '29000000-0000-4000-b000-000000000002',
  '29000000-0000-4000-a000-000000000004',
  'Puedo mañana a la mañana.',
  15000,
  'enviada'
);

-- P2 queda suspendido después de postularse
update public.usuarios set estado = 'suspendida' where id = '29000000-0000-4000-a000-000000000004';

reset role; select tests.como('29000000-0000-4000-a000-000000000001'); -- C1 dueño
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000003')$$,
  '22023',
  'El profesional ya no está disponible para este trabajo',
  'no se puede elegir a un profesional con cuenta suspendida'
);

-- P2 vuelve a tener cuenta activa pero sin perfil publicado
reset role;
update public.usuarios set estado = 'activa' where id = '29000000-0000-4000-a000-000000000004';
update public.perfiles_profesionales set identidad_verificada = false where usuario_id = '29000000-0000-4000-a000-000000000004';

reset role; select tests.como('29000000-0000-4000-a000-000000000001'); -- C1 dueño
select throws_ok(
  $$select public.elegir_postulante('29000000-0000-4000-c000-000000000003')$$,
  '22023',
  'El profesional ya no está disponible para este trabajo',
  'no se puede elegir a un profesional cuyo perfil no está publicado'
);

rollback;
