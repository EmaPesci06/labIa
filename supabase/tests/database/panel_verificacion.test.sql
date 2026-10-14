-- LAB-21 · Tests del panel de verificación (pgTAP). Todo corre en una transacción que se deshace.
-- Usuarios (prefijo dddddddd-2000): P profesional · A admin · C cliente · P2 profesional con poca cuota.
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

-- ---------------------------------------------------------------------------
-- Preparación (como postgres, que saltea RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-2000-4000-a000-000000000001', 'authenticated', 'authenticated', 'pan-p@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Panel"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-2000-4000-a000-000000000002', 'authenticated', 'authenticated', 'pan-a@labia.test', '{"nombre": "Ana", "apellido": "Admin"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-2000-4000-a000-000000000003', 'authenticated', 'authenticated', 'pan-c@labia.test', '{"nombre": "Carla", "apellido": "Cliente"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-2000-4000-a000-000000000004', 'authenticated', 'authenticated', 'pan-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Pocacuota"}');

update public.usuarios set rol = 'admin' where id = 'dddddddd-2000-4000-a000-000000000002';

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, zonas)
values
  ('dddddddd-2000-4000-a000-000000000001', '{plomeria}', true, '{}'),
  ('dddddddd-2000-4000-a000-000000000004', '{plomeria}', true, '{}');

-- P tiene 12 archivos en su carpeta (el máximo); P2 tiene uno y uno viejo sin registrar.
insert into storage.objects (bucket_id, name)
values
  ('documentos', 'dddddddd-2000-4000-a000-000000000001/dni_frente-1791734400001.jpg'),
  ('documentos', 'dddddddd-2000-4000-a000-000000000001/dni_dorso-1791734400002.jpg'),
  ('documentos', 'dddddddd-2000-4000-a000-000000000001/antecedentes-1791734400003.pdf');

insert into storage.objects (bucket_id, name)
select 'documentos', 'dddddddd-2000-4000-a000-000000000001/relleno-' || g || '.jpg'
from generate_series(1, 9) as g;

insert into storage.objects (bucket_id, name)
values ('documentos', 'dddddddd-2000-4000-a000-000000000004/dni_frente-1791734400005.jpg');

insert into storage.objects (bucket_id, name, created_at)
values ('documentos', 'dddddddd-2000-4000-a000-000000000004/antecedentes-1791734400009.pdf', now() - interval '2 days');

insert into public.verificaciones (id, usuario_id, tipo, storage_path, estado, created_at)
values
  ('eeeeeeee-2000-4000-a000-000000000001', 'dddddddd-2000-4000-a000-000000000001', 'dni_frente', 'dddddddd-2000-4000-a000-000000000001/dni_frente-1791734400001.jpg', 'pendiente', '2026-10-01T10:00:00Z'),
  ('eeeeeeee-2000-4000-a000-000000000002', 'dddddddd-2000-4000-a000-000000000001', 'dni_dorso', 'dddddddd-2000-4000-a000-000000000001/dni_dorso-1791734400002.jpg', 'pendiente', '2026-10-02T10:00:00Z'),
  ('eeeeeeee-2000-4000-a000-000000000003', 'dddddddd-2000-4000-a000-000000000001', 'antecedentes', 'dddddddd-2000-4000-a000-000000000001/antecedentes-1791734400003.pdf', 'pendiente', '2026-10-03T10:00:00Z');

-- ---------------------------------------------------------------------------
-- Solo un admin decide
-- ---------------------------------------------------------------------------

select tests.como('dddddddd-2000-4000-a000-000000000001');
select throws_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000001', true)$$,
  '42501',
  'decidir_documento: un profesional no puede aprobar'
);

select tests.como('dddddddd-2000-4000-a000-000000000003');
select throws_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000001', true)$$,
  '42501',
  'decidir_documento: un cliente no puede aprobar'
);

-- ---------------------------------------------------------------------------
-- Aprobar: insignias, publicación y auditoría
-- ---------------------------------------------------------------------------

select tests.como('dddddddd-2000-4000-a000-000000000002');
select lives_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000001', true)$$,
  'decidir_documento: el admin aprueba el DNI frente'
);

reset role;
select is(
  (select estado::text from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000001'),
  'aprobado',
  'decidir_documento: el documento queda aprobado'
);
select is(
  (select revisado_por from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000001'),
  'dddddddd-2000-4000-a000-000000000002'::uuid,
  'decidir_documento: guarda quién decidió'
);
select ok(
  (select revisado_at is not null from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000001'),
  'decidir_documento: guarda cuándo decidió'
);
select ok(
  (select borrar_despues_de > now() + interval '29 days' and borrar_despues_de < now() + interval '31 days'
   from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000001'),
  'retención: un documento decidido se borra a los 30 días'
);
select is(
  (select identidad_verificada from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  false,
  'insignias: con solo el frente aprobado la identidad todavía no está verificada'
);

select tests.como('dddddddd-2000-4000-a000-000000000002');
select lives_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000002', true)$$,
  'decidir_documento: aprueba el DNI dorso'
);
select lives_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000003', true)$$,
  'decidir_documento: aprueba los antecedentes'
);

reset role;
select is(
  (select identidad_verificada from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  true,
  'insignias: frente y dorso aprobados dan identidad verificada'
);
select is(
  (select antecedentes_ok from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  true,
  'insignias: antecedentes aprobados dan antecedentes_ok'
);
select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  true,
  'publicado: con identidad y antecedentes aprobados el perfil se publica'
);
select is(
  (select count(*) from public.acciones_moderacion where objetivo_id = 'eeeeeeee-2000-4000-a000-000000000001' and accion = 'verificacion_aprobada'),
  1::bigint,
  'auditoría: la decisión queda en acciones_moderacion'
);

-- ---------------------------------------------------------------------------
-- Rechazar: motivo obligatorio, insignia baja y el perfil se despublica
-- ---------------------------------------------------------------------------

insert into public.verificaciones (id, usuario_id, tipo, storage_path, estado)
values ('eeeeeeee-2000-4000-a000-000000000004', 'dddddddd-2000-4000-a000-000000000001', 'dni_frente', 'dddddddd-2000-4000-a000-000000000001/dni_frente-1791734400010.jpg', 'pendiente');

select tests.como('dddddddd-2000-4000-a000-000000000002');
select throws_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000004', false, null, null)$$,
  '23514',
  'decidir_documento: rechazar sin motivo falla'
);
select lives_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000004', false, 'Foto borrosa', 'Se ve movido')$$,
  'decidir_documento: el admin rechaza con motivo y detalle'
);
select throws_ok(
  $$select * from public.decidir_documento('eeeeeeee-2000-4000-a000-000000000004', true)$$,
  '23514',
  'decidir_documento: no se puede decidir dos veces el mismo documento'
);

reset role;
select is(
  (select motivo_rechazo from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000004'),
  'Foto borrosa: Se ve movido',
  'decidir_documento: el motivo guarda la categoría y el detalle'
);
select is(
  (select identidad_verificada from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  false,
  'insignias: un rechazo nuevo baja la identidad verificada'
);
select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'dddddddd-2000-4000-a000-000000000001'),
  false,
  'publicado: un rechazo despublica el perfil'
);

-- ---------------------------------------------------------------------------
-- Reemplazo automático: el archivo viejo caduca a 1 día, no a 30
-- ---------------------------------------------------------------------------

insert into public.verificaciones (id, usuario_id, tipo, storage_path, estado)
values ('eeeeeeee-2000-4000-a000-000000000005', 'dddddddd-2000-4000-a000-000000000001', 'matricula', 'dddddddd-2000-4000-a000-000000000001/matricula-1791734400020.png', 'pendiente');
insert into storage.objects (bucket_id, name)
values ('documentos', 'dddddddd-2000-4000-a000-000000000001/matricula-1791734400021.png');

select tests.como('dddddddd-2000-4000-a000-000000000001');
select lives_ok(
  $$select public.registrar_documento('matricula', 'dddddddd-2000-4000-a000-000000000001/matricula-1791734400021.png')$$,
  'registrar_documento: el profesional carga una matrícula nueva'
);

reset role;
select is(
  (select estado::text from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000005'),
  'rechazado',
  'reemplazo: el pendiente anterior queda rechazado'
);
select ok(
  (select borrar_despues_de < now() + interval '2 days' and borrar_despues_de > now()
   from public.verificaciones where id = 'eeeeeeee-2000-4000-a000-000000000005'),
  'retención: un reemplazado caduca en 1 día'
);

-- ---------------------------------------------------------------------------
-- Cuota por cuenta (12 archivos en documentos)
-- ---------------------------------------------------------------------------

reset role;
select is(
  (select count(*) from storage.objects where bucket_id = 'documentos' and name like 'dddddddd-2000-4000-a000-000000000001/%'),
  13::bigint,
  'cuota: P tiene 13 archivos en su carpeta (incluye el reemplazado que todavía no caducó)'
);

select tests.como('dddddddd-2000-4000-a000-000000000001');
select is(
  privado.cantidad_documentos_propios(),
  13,
  'cuota: el conteo de la función coincide con los archivos de la carpeta'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'dddddddd-2000-4000-a000-000000000001/dni_dorso-1791734400099.jpg')$$,
  '42501',
  'cuota: con 12 o más archivos no se puede subir otro'
);

select tests.como('dddddddd-2000-4000-a000-000000000004');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'dddddddd-2000-4000-a000-000000000004/dni_dorso-1791734400030.jpg')$$,
  'cuota: una cuenta por debajo del tope sí puede subir'
);

-- ---------------------------------------------------------------------------
-- Huérfanos, privilegios y auditoría
-- ---------------------------------------------------------------------------

reset role;
select ok(
  exists (
    select 1 from public.documentos_huerfanos(now() - interval '1 day') r
    where r = 'dddddddd-2000-4000-a000-000000000004/antecedentes-1791734400009.pdf'
  ),
  'huérfanos: un archivo viejo sin registrar aparece para borrar'
);
select ok(
  not exists (
    select 1 from public.documentos_huerfanos(now() - interval '1 day') r
    where r = 'dddddddd-2000-4000-a000-000000000001/dni_frente-1791734400001.jpg'
  ),
  'huérfanos: un archivo con fila en verificaciones no se toca'
);
select ok(
  has_function_privilege('service_role', 'public.documentos_huerfanos(timestamptz)', 'execute'),
  'huérfanos: el job (service role) puede listarlos'
);
select ok(
  not has_function_privilege('authenticated', 'public.documentos_huerfanos(timestamptz)', 'execute'),
  'huérfanos: un usuario logueado no puede listarlos'
);
select ok(
  has_function_privilege('authenticated', 'public.decidir_documento(uuid, boolean, text, text)', 'execute'),
  'decidir_documento: se puede llamar con sesión'
);
select ok(
  not has_function_privilege('anon', 'public.decidir_documento(uuid, boolean, text, text)', 'execute'),
  'decidir_documento: anon no puede llamarla'
);
select ok(
  not has_table_privilege('authenticated', 'public.accesos_documentos', 'insert'),
  'auditoría: nadie escribe accesos_documentos desde la API (lo hace el servidor)'
);
select ok(
  not has_table_privilege('anon', 'public.accesos_documentos', 'select'),
  'auditoría: anon no lee accesos_documentos'
);
select ok(
  (select position('cantidad_documentos_propios' in with_check) > 0
   from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documentos_subir_propios'),
  'cuota: la política de subida usa el tope por cuenta'
);

select * from finish();

rollback;
