-- LAB-44 · Permisos de trabajos y postulaciones, y la función retirar_postulacion (pgTAP).
-- Todo corre en una transacción y se deshace al final: no deja datos.
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
-- Datos de prueba (como postgres, saltea RLS)
-- ---------------------------------------------------------------------------

-- Cliente C · Profesionales P y Q (publicados) · Profesional S (suspendido)

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'cliente-44@labia.test', '{"rol": "cliente", "nombre": "Carla", "apellido": "Gómez"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'pro-p-44@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "López"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'pro-q-44@labia.test', '{"rol": "profesional", "nombre": "Quique", "apellido": "Ruiz"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '44000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'pro-s-44@labia.test', '{"rol": "profesional", "nombre": "Sergio", "apellido": "Sosa"}'::jsonb);

update public.usuarios set barrio_id = (select id from public.barrios where slug = 'centro')
where id in (
  '44000000-0000-4000-a000-000000000001',
  '44000000-0000-4000-a000-000000000002',
  '44000000-0000-4000-a000-000000000003',
  '44000000-0000-4000-a000-000000000004'
);

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok)
values
  ('44000000-0000-4000-a000-000000000002', array['plomeria'::public.oficio], true, true, true),
  ('44000000-0000-4000-a000-000000000003', array['plomeria'::public.oficio], true, true, true),
  ('44000000-0000-4000-a000-000000000004', array['plomeria'::public.oficio], true, true, true);

update public.usuarios set estado = 'suspendida' where id = '44000000-0000-4000-a000-000000000004';

-- T1 abierto del cliente C, con postulaciones enviadas de P (PO1), Q (PO2) y S (PO4)
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
values (
  '44000000-0000-4000-b000-000000000001',
  '44000000-0000-4000-a000-000000000001',
  'plomeria',
  'Reparar canilla',
  'Gotea la canilla de la cocina.',
  (select id from public.barrios where slug = 'centro'),
  'sin_apuro',
  'abierto'
);

insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, estado)
values
  ('44000000-0000-4000-c000-000000000001', '44000000-0000-4000-b000-000000000001', '44000000-0000-4000-a000-000000000002', 'Voy hoy.', 'enviada'),
  ('44000000-0000-4000-c000-000000000002', '44000000-0000-4000-b000-000000000001', '44000000-0000-4000-a000-000000000003', 'Mañana.', 'enviada'),
  ('44000000-0000-4000-c000-000000000004', '44000000-0000-4000-b000-000000000001', '44000000-0000-4000-a000-000000000004', 'Cuando pueda.', 'enviada');

-- T2 asignado a P, con la postulación de P elegida (PO3)
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, profesional_elegido_id)
values (
  '44000000-0000-4000-b000-000000000002',
  '44000000-0000-4000-a000-000000000001',
  'plomeria',
  'Cambiar sifón',
  'Sifón de la pileta.',
  (select id from public.barrios where slug = 'centro'),
  'sin_apuro',
  'asignado',
  '44000000-0000-4000-a000-000000000002'
);

insert into public.postulaciones (id, trabajo_id, profesional_id, mensaje, estado)
values ('44000000-0000-4000-c000-000000000003', '44000000-0000-4000-b000-000000000002', '44000000-0000-4000-a000-000000000002', 'Lo hago yo.', 'elegida');

-- ---------------------------------------------------------------------------
-- retirar_postulacion: autorización y reglas
-- ---------------------------------------------------------------------------

reset role; select tests.anonimo();
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000001')$$,
  '42501', null,
  'retirar_postulacion: anon no puede llamarla'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000001'); -- C cliente
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000001')$$,
  '42501', 'No autorizado',
  'retirar_postulacion: un cliente no puede retirar postulaciones'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000003'); -- Q, otro profesional
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000001')$$,
  'P0002', 'Postulación no encontrada',
  'retirar_postulacion: un profesional no retira la postulación de otro'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000002'); -- P dueño
select is(
  public.retirar_postulacion('44000000-0000-4000-c000-000000000001'),
  true,
  'retirar_postulacion: el dueño retira su postulación enviada'
);

reset role;
select is(
  (select estado::text from public.postulaciones where id = '44000000-0000-4000-c000-000000000001'),
  'retirada',
  'la postulación retirada queda en estado retirada'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000002');
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000001')$$,
  '22023', 'Solo podés retirar una postulación que sigue enviada',
  'retirar_postulacion: no se retira dos veces'
);
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000003')$$,
  '22023', 'Solo podés retirar una postulación que sigue enviada',
  'retirar_postulacion: no se retira una postulación elegida'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000004'); -- S suspendido
select throws_ok(
  $$select public.retirar_postulacion('44000000-0000-4000-c000-000000000004')$$,
  '42501', 'No autorizado',
  'retirar_postulacion: un profesional suspendido no retira'
);

-- ---------------------------------------------------------------------------
-- reactivar_postulacion: la retirada vuelve a enviarse si el trabajo sigue abierto
-- ---------------------------------------------------------------------------

reset role; select tests.como('44000000-0000-4000-a000-000000000001'); -- C cliente
select throws_ok(
  $$select public.reactivar_postulacion('44000000-0000-4000-b000-000000000001', 'Quiero volver a postularme.', 9000, 3000)$$,
  '42501', 'No autorizado',
  'reactivar_postulacion: un cliente no puede reactivar postulaciones'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000002'); -- P dueño de PO1 (retirada)
select is(
  public.reactivar_postulacion('44000000-0000-4000-b000-000000000001', 'Quiero volver a postularme.', 9000, 3000),
  '44000000-0000-4000-c000-000000000001'::uuid,
  'reactivar_postulacion: el dueño vuelve a enviar su postulación retirada'
);
select is(
  (select estado::text from public.postulaciones where id = '44000000-0000-4000-c000-000000000001'),
  'enviada',
  'la postulación reactivada queda enviada'
);
select throws_ok(
  $$select public.reactivar_postulacion('44000000-0000-4000-b000-000000000001', 'Otra vez.', 9000, 3000)$$,
  'P0002', 'No hay una postulación retirada para reactivar',
  'reactivar_postulacion: una postulación ya enviada no se reactiva'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000003'); -- Q, otro profesional
select throws_ok(
  $$select public.reactivar_postulacion('44000000-0000-4000-b000-000000000002', 'Yo también.', 9000, 3000)$$,
  'P0002', 'No hay una postulación retirada para reactivar',
  'reactivar_postulacion: sin postulación propia no hay nada para reactivar'
);

-- ---------------------------------------------------------------------------
-- Permisos de escritura: el cliente no cambia el estado ni el profesional por la API
-- ---------------------------------------------------------------------------

reset role; select tests.como('44000000-0000-4000-a000-000000000001'); -- C cliente dueño
select throws_ok(
  $$update public.trabajos set estado = 'cancelado' where id = '44000000-0000-4000-b000-000000000001'$$,
  '42501', null,
  'trabajos: el cliente no cambia el estado con un update directo'
);
select throws_ok(
  $$update public.trabajos set profesional_elegido_id = '44000000-0000-4000-a000-000000000003' where id = '44000000-0000-4000-b000-000000000001'$$,
  '42501', null,
  'trabajos: el cliente no asigna profesional con un update directo'
);
select results_eq(
  $$update public.trabajos set descripcion = 'Gotea mucho más' where id = '44000000-0000-4000-b000-000000000001' returning descripcion$$,
  $$values ('Gotea mucho más'::text)$$,
  'trabajos: el dueño sigue pudiendo editar la descripción de su trabajo'
);
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where id = '44000000-0000-4000-c000-000000000002'$$,
  '42501', null,
  'postulaciones: el cliente no elige con un update directo (lo hace elegir_postulante)'
);

reset role; select tests.como('44000000-0000-4000-a000-000000000002'); -- P profesional
select throws_ok(
  $$update public.postulaciones set estado = 'retirada' where id = '44000000-0000-4000-c000-000000000002'$$,
  '42501', null,
  'postulaciones: un profesional no retira la de otro con un update directo'
);

-- ---------------------------------------------------------------------------
-- Las funciones de estado siguen funcionando después de revocar los updates directos
-- ---------------------------------------------------------------------------

reset role; select tests.como('44000000-0000-4000-a000-000000000001'); -- C cliente dueño
select is(
  public.cancelar_trabajo('44000000-0000-4000-b000-000000000001'),
  true,
  'cancelar_trabajo (security definer) sigue cambiando el estado del trabajo'
);

reset role;

select * from finish();

rollback;
