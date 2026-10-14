-- LAB-19 · Tests de public.registrar_documento (pgTAP). Todo corre en una transacción que se deshace.
-- Usuarios (prefijo cccccccc-1900): P profesional · C cliente · A admin.
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

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1900-4000-a000-000000000001', 'authenticated', 'authenticated', 'doc-p@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Doc"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1900-4000-a000-000000000002', 'authenticated', 'authenticated', 'doc-c@labia.test', '{"nombre": "Carla", "apellido": "Doc"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1900-4000-a000-000000000003', 'authenticated', 'authenticated', 'doc-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Doc"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1900-4000-a000-000000000004', 'authenticated', 'authenticated', 'doc-p3@labia.test', '{"rol": "profesional", "nombre": "Sofia", "apellido": "Doc"}');

-- El cuarto profesional (…0004) está suspendido.
update public.usuarios set estado = 'suspendida' where id = 'cccccccc-1900-4000-a000-000000000004';

-- Consentimiento para datos sensibles (LAB-43): el profesional …0001 lo dio en la versión vigente.
-- …0003 todavía no lo dio, y se prueba más abajo.
update public.usuarios
set datos_sensibles_version = '2026-10', datos_sensibles_consentido_at = now()
where id = 'cccccccc-1900-4000-a000-000000000001';

-- Archivos ya subidos al bucket (como lo hace la URL firmada de subida).
insert into storage.objects (bucket_id, name)
values
  ('documentos', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400001.jpg'),
  ('documentos', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400002.jpg'),
  ('documentos', 'cccccccc-1900-4000-a000-000000000001/antecedentes-1791734400003.pdf'),
  ('documentos', 'cccccccc-1900-4000-a000-000000000003/dni_dorso-1791734400004.png'),
  ('documentos', 'cccccccc-1900-4000-a000-000000000004/dni_frente-1791734400005.jpg');

select tests.como('cccccccc-1900-4000-a000-000000000001');

select lives_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400001.jpg')$$,
  'registrar_documento: el profesional registra un archivo ya subido'
);
select is(
  (select estado::text from public.mis_verificaciones where tipo = 'dni_frente'),
  'pendiente',
  'registrar_documento: queda pendiente'
);
select lives_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400002.jpg')$$,
  'registrar_documento: un documento nuevo del mismo tipo reemplaza al pendiente'
);
select is(
  (select count(*) from public.mis_verificaciones where tipo = 'dni_frente' and estado = 'pendiente'),
  1::bigint,
  'registrar_documento: queda un solo pendiente por tipo'
);
select is(
  (select count(*) from public.mis_verificaciones where tipo = 'dni_frente' and estado = 'rechazado' and motivo_rechazo = 'Reemplazado por un documento nuevo'),
  1::bigint,
  'registrar_documento: el viejo queda como rechazado (auditoría)'
);
select lives_ok(
  $$select public.registrar_documento('antecedentes', 'cccccccc-1900-4000-a000-000000000001/antecedentes-1791734400003.pdf')$$,
  'registrar_documento: acepta un PDF de antecedentes'
);

select throws_ok(
  $$select public.registrar_documento('dni_dorso', 'cccccccc-1900-4000-a000-000000000001/dni_dorso-1791734400009.jpg')$$,
  '23514', null, 'registrar_documento: el archivo tiene que existir en el bucket'
);
select throws_ok(
  $$select public.registrar_documento('dni_dorso', 'cccccccc-1900-4000-a000-000000000003/dni_dorso-1791734400004.png')$$,
  '23514', null, 'registrar_documento: no registra un archivo de otra persona'
);
select throws_ok(
  $$select public.registrar_documento('matricula', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400001.jpg')$$,
  '23514', null, 'registrar_documento: el nombre tiene que corresponder al tipo'
);
select throws_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000001/../x/dni_frente-1.jpg')$$,
  '23514', null, 'registrar_documento: rechaza recorridos de carpetas'
);
select throws_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400001.gif')$$,
  '23514', null, 'registrar_documento: rechaza extensiones no permitidas'
);
select lives_ok(
  $$select public.registrar_documento('antecedentes', 'cccccccc-1900-4000-a000-000000000001/antecedentes-1791734400003.pdf')$$,
  'registrar_documento: registrar dos veces la misma ruta no falla'
);
select is(
  (select count(*) from public.mis_verificaciones where tipo = 'antecedentes' and estado = 'pendiente'),
  1::bigint,
  'registrar_documento: la misma ruta repetida deja un solo pendiente'
);
select is_empty(
  $$select storage_path from public.verificaciones$$,
  'registrar_documento: el dueño sigue sin poder leer la tabla ni el path'
);

reset role; select tests.como('cccccccc-1900-4000-a000-000000000002');
select throws_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000002/dni_frente-1791734400001.jpg')$$,
  '42501', null, 'registrar_documento: un cliente no registra documentos'
);

reset role; select tests.como('cccccccc-1900-4000-a000-000000000004');
select throws_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000004/dni_frente-1791734400005.jpg')$$,
  '42501', null, 'registrar_documento: un profesional suspendido no registra documentos'
);

reset role;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000001/dni_frente-1791734400001.jpg')$$,
  '42501', null, 'registrar_documento: anon no puede llamarla'
);

reset role;
select is(
  (select count(*) from public.verificaciones where usuario_id = 'cccccccc-1900-4000-a000-000000000001' and tipo = 'dni_frente'),
  2::bigint,
  'registrar_documento: el viejo y el nuevo siguen en la tabla'
);

-- Consentimiento (LAB-43): sin consentimiento vigente no se sube al bucket ni se registra.
-- …0003 es profesional activo pero todavía no dio el consentimiento.
reset role; select tests.como('cccccccc-1900-4000-a000-000000000003');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1900-4000-a000-000000000003/dni_frente-1791734400010.jpg')$$,
  '42501', null, 'consentimiento: sin consentimiento no sube al bucket'
);
select throws_ok(
  $$select public.registrar_documento('dni_dorso', 'cccccccc-1900-4000-a000-000000000003/dni_dorso-1791734400004.png')$$,
  '42501', null, 'consentimiento: sin consentimiento no registra un documento'
);

-- Un consentimiento de una versión vieja de la política no vale.
reset role;
update public.usuarios
set datos_sensibles_version = '2026-09', datos_sensibles_consentido_at = now()
where id = 'cccccccc-1900-4000-a000-000000000003';
select tests.como('cccccccc-1900-4000-a000-000000000003');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1900-4000-a000-000000000003/dni_frente-1791734400011.jpg')$$,
  '42501', null, 'consentimiento: una versión vieja no sirve para subir'
);
select throws_ok(
  $$select public.registrar_documento('dni_dorso', 'cccccccc-1900-4000-a000-000000000003/dni_dorso-1791734400004.png')$$,
  '42501', null, 'consentimiento: una versión vieja no sirve para registrar'
);

-- Con el consentimiento de la versión vigente, sí.
reset role;
update public.usuarios
set datos_sensibles_version = '2026-10'
where id = 'cccccccc-1900-4000-a000-000000000003';
select tests.como('cccccccc-1900-4000-a000-000000000003');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1900-4000-a000-000000000003/dni_frente-1791734400012.jpg')$$,
  'consentimiento: con la versión vigente sube al bucket'
);
select lives_ok(
  $$select public.registrar_documento('dni_frente', 'cccccccc-1900-4000-a000-000000000003/dni_frente-1791734400012.jpg')$$,
  'consentimiento: con la versión vigente registra el documento'
);

reset role;
select * from finish();

rollback;
