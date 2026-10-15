-- LAB-27 · Tests de public.trabajos_para_mi y cantidad_postulaciones (pgTAP).
-- Todo corre en una transacción y se deshace al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create schema tests;

grant usage on schema tests to anon, authenticated;

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
-- Datos de prueba (como postgres, saltea RLS)
-- ---------------------------------------------------------------------------

-- Usuarios:
-- Cliente: U1
-- Profesional Plomero (publicado, plaza-mitre): P1
-- Profesional Gasista (publicado, centro): P2
-- Profesional Plomero (en revisión, chauvin): P3
-- Profesional Suspendido (plomero): P4

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'cliente-27@labia.test', '{"rol": "cliente", "nombre": "Carla", "apellido": "Gómez"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'plomero-27@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "López"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'gasista-27@labia.test', '{"rol": "profesional", "nombre": "Gustavo", "apellido": "Díaz"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'revision-27@labia.test', '{"rol": "profesional", "nombre": "Rosa", "apellido": "Pérez"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '27000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'suspendido-27@labia.test', '{"rol": "profesional", "nombre": "Sergio", "apellido": "Sosa"}'::jsonb);

-- Asignar barrios a usuarios
-- 17 centro, 80 plaza-mitre, 20 chauvin
update public.usuarios set barrio_id = 17 where id = '27000000-0000-4000-a000-000000000001';
update public.usuarios set barrio_id = 80 where id = '27000000-0000-4000-a000-000000000002';
update public.usuarios set barrio_id = 17 where id = '27000000-0000-4000-a000-000000000003';
update public.usuarios set barrio_id = 20 where id = '27000000-0000-4000-a000-000000000004';
update public.usuarios set barrio_id = 80, estado = 'suspendida' where id = '27000000-0000-4000-a000-000000000005';

-- Perfiles profesionales
-- P1: Plomero publicado en plaza-mitre, zonas {80, 17}
insert into public.perfiles_profesionales (usuario_id, oficios, zonas, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values ('27000000-0000-4000-a000-000000000002', '{plomeria}', '{80, 17}', false, true, true, true);

-- P2: Gasista publicado en centro, toda_la_ciudad
insert into public.perfiles_profesionales (usuario_id, oficios, zonas, toda_la_ciudad, matriculado, identidad_verificada, antecedentes_ok, publicado)
values ('27000000-0000-4000-a000-000000000003', '{gas}', '{}', true, true, true, true, true);

-- P3: Plomero en revisión (no publicado)
insert into public.perfiles_profesionales (usuario_id, oficios, zonas, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values ('27000000-0000-4000-a000-000000000004', '{plomeria}', '{20}', false, false, false, false);

-- P4: Plomero suspendido
insert into public.perfiles_profesionales (usuario_id, oficios, zonas, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values ('27000000-0000-4000-a000-000000000005', '{plomeria}', '{80}', false, true, true, true);

-- Trabajos:
-- T1: Plomería, abierto, barrio 17 (centro), urgente (hace 1 hora)
-- T2: Plomería, abierto, barrio 80 (plaza-mitre), sin apuro (hace 2 días)
-- T3: Gas, abierto, barrio 17 (centro), sin apuro
-- T4: Plomería, cerrado (asignado), barrio 80
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, created_at)
values
  ('27000000-0000-4000-b000-000000000001', '27000000-0000-4000-a000-000000000001', 'plomeria', 'Urgente caño roto', 'Pierde mucha agua en la cocina', 17, 'lo_antes_posible', 'abierto', now() - interval '1 hour'),
  ('27000000-0000-4000-b000-000000000002', '27000000-0000-4000-a000-000000000001', 'plomeria', 'Cambio de canilla', 'Cambiar canilla del lavadero', 80, 'sin_apuro', 'abierto', now() - interval '2 days'),
  ('27000000-0000-4000-b000-000000000003', '27000000-0000-4000-a000-000000000001', 'gas', 'Instalación estufa tiro balanceado', 'Instalar en dormitorio', 17, 'sin_apuro', 'abierto', now() - interval '3 hours'),
  ('27000000-0000-4000-b000-000000000004', '27000000-0000-4000-a000-000000000001', 'plomeria', 'Trabajo ya asignado', 'Este ya no está abierto', 80, 'sin_apuro', 'asignado', now() - interval '5 days');

-- ---------------------------------------------------------------------------
-- 1. Permisos y seguridad
-- ---------------------------------------------------------------------------

reset role; select tests.anonimo();
select throws_ok(
  $$select * from public.trabajos_para_mi()$$,
  '42501',
  null,
  'anon no puede ejecutar trabajos_para_mi'
);

reset role; select tests.como('27000000-0000-4000-a000-000000000001'); -- Cliente
select is(
  (select count(*) from public.trabajos_para_mi()),
  0::bigint,
  'un cliente recibe 0 trabajos de trabajos_para_mi'
);

reset role; select tests.como('27000000-0000-4000-a000-000000000005'); -- Suspendido
select is(
  (select count(*) from public.trabajos_para_mi()),
  0::bigint,
  'un profesional suspendido recibe 0 trabajos'
);

-- ---------------------------------------------------------------------------
-- 2. Filtro por oficio y estado de trabajo
-- ---------------------------------------------------------------------------

reset role; select tests.como('27000000-0000-4000-a000-000000000002'); -- Plomero P1
select is(
  (select count(*) from public.trabajos_para_mi() where id in ('27000000-0000-4000-b000-000000000001', '27000000-0000-4000-b000-000000000002', '27000000-0000-4000-b000-000000000004')),
  2::bigint,
  'el plomero ve los 2 trabajos abiertos de plomería (T1 y T2)'
);

select is(
  (select count(*) from public.trabajos_para_mi() where oficio = 'gas'),
  0::bigint,
  'un plomero no ve trabajos de gas'
);

select is(
  (select count(*) from public.trabajos_para_mi() where id = '27000000-0000-4000-b000-000000000004'),
  0::bigint,
  'trabajos cerrados/asignados no aparecen en trabajos_para_mi'
);

-- ---------------------------------------------------------------------------
-- 3. Orden: urgente de <24h primero
-- ---------------------------------------------------------------------------

select is(
  (select id from public.trabajos_para_mi() limit 1),
  '27000000-0000-4000-b000-000000000001'::uuid,
  'el trabajo urgente de la última hora (T1) aparece primero en la lista'
);

-- ---------------------------------------------------------------------------
-- 4. Profesional en revisión no ve trabajos (LAB-44: exige perfil publicado)
-- ---------------------------------------------------------------------------

reset role; select tests.como('27000000-0000-4000-a000-000000000004'); -- P3 en revisión
select is(
  (select count(*) from public.trabajos_para_mi(p_solo_mis_zonas => false)),
  0::bigint,
  'un profesional en revisión no recibe trabajos aunque sean de su oficio, con p_solo_mis_zonas => false'
);

-- ---------------------------------------------------------------------------
-- 5. Trigger cantidad_postulaciones y ya_me_postule
-- ---------------------------------------------------------------------------

reset role;
insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, precio_estimado, estado)
values (
  '27000000-0000-4000-c000-000000000001',
  '27000000-0000-4000-b000-000000000001',
  '27000000-0000-4000-a000-000000000002',
  'Voy en 30 minutos',
  5000,
  'enviada'
);

select is(
  (select cantidad_postulaciones from public.trabajos where id = '27000000-0000-4000-b000-000000000001'),
  1,
  'el trigger incrementó cantidad_postulaciones a 1 tras insertar la postulación'
);

reset role; select tests.como('27000000-0000-4000-a000-000000000002');
select ok(
  (select ya_me_postule from public.trabajos_para_mi() where id = '27000000-0000-4000-b000-000000000001'),
  'ya_me_postule es true para el trabajo al que se postuló'
);

-- Retirar postulación decrementa el contador
reset role;
update public.postulaciones
set estado = 'retirada'
where id = '27000000-0000-4000-c000-000000000001';

select is(
  (select cantidad_postulaciones from public.trabajos where id = '27000000-0000-4000-b000-000000000001'),
  0,
  'el trigger decrementó cantidad_postulaciones a 0 al retirar la postulación'
);

-- ---------------------------------------------------------------------------
-- 6. Política trabajos_leer_postulado
-- ---------------------------------------------------------------------------

-- Volvemos a postular a P1 al trabajo asignado T4
reset role;
insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, precio_estimado, estado)
values (
  '27000000-0000-4000-c000-000000000002',
  '27000000-0000-4000-b000-000000000004',
  '27000000-0000-4000-a000-000000000002',
  'Mi presupuesto',
  8000,
  'descartada'
);

reset role; select tests.como('27000000-0000-4000-a000-000000000002');
select is(
  (select count(*) from public.trabajos where id = '27000000-0000-4000-b000-000000000004'),
  1::bigint,
  'el profesional postulante puede leer el trabajo asignado/cerrado gracias a trabajos_leer_postulado'
);

rollback;
