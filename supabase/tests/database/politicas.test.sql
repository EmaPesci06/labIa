-- LAB-12 · Tests de políticas RLS, permisos y Storage (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final: no deja datos.
--
-- Cada tabla prueba lo que SÍ se puede y lo que NO, por rol: anon, cliente, profesional, dueño y admin.
-- Usuarios de prueba (prefijo cccccccc-1200):
--   admin · C1 y C2 clientes · C3 cliente sin relaciones · CS cliente suspendido
--   P1 y P3 profesionales publicados · P2 profesional sin verificar · P4 profesional nuevo (sin perfil)
--   PS profesional suspendido
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Helpers de rol. Se llaman siempre después de `reset role` (corren como postgres).
-- ---------------------------------------------------------------------------

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

create function tests.anonimo() returns void language plpgsql as $$
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
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000001', 'authenticated', 'authenticated', 'rls-admin@labia.test', '{"nombre": "Ada", "apellido": "Admin"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000002', 'authenticated', 'authenticated', 'rls-c1@labia.test', '{"nombre": "Carla", "apellido": "Uno"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000003', 'authenticated', 'authenticated', 'rls-c2@labia.test', '{"nombre": "Carlos", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000004', 'authenticated', 'authenticated', 'rls-p1@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Gómez"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000005', 'authenticated', 'authenticated', 'rls-p2@labia.test', '{"rol": "profesional", "nombre": "Paula", "apellido": "Dos"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000006', 'authenticated', 'authenticated', 'rls-cs@labia.test', '{"nombre": "Susana", "apellido": "Suspendida"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000007', 'authenticated', 'authenticated', 'rls-ps@labia.test', '{"rol": "profesional", "nombre": "Sergio", "apellido": "Suspendido"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000008', 'authenticated', 'authenticated', 'rls-p3@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "Tres"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-000000000009', 'authenticated', 'authenticated', 'rls-c3@labia.test', '{"nombre": "Clara", "apellido": "Tres"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-1200-4000-a000-00000000000a', 'authenticated', 'authenticated', 'rls-p4@labia.test', '{"rol": "profesional", "nombre": "Paco", "apellido": "Cuatro"}');

update public.usuarios set rol = 'admin' where id = 'cccccccc-1200-4000-a000-000000000001';

update public.usuarios u
set whatsapp = '+54922355512' || d.n,
    barrio_id = (select b.id from public.barrios b where b.slug = 'centro')
from (values
  ('cccccccc-1200-4000-a000-000000000001', '00'), ('cccccccc-1200-4000-a000-000000000002', '01'), ('cccccccc-1200-4000-a000-000000000003', '02'), ('cccccccc-1200-4000-a000-000000000004', '03'), ('cccccccc-1200-4000-a000-000000000005', '04'),
  ('cccccccc-1200-4000-a000-000000000006', '05'), ('cccccccc-1200-4000-a000-000000000007', '06'), ('cccccccc-1200-4000-a000-000000000008', '07'), ('cccccccc-1200-4000-a000-000000000009', '08'), ('cccccccc-1200-4000-a000-00000000000a', '09')
) as d (id, n)
where u.id = d.id::uuid;

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok)
values
  ('cccccccc-1200-4000-a000-000000000004', '{plomeria}', true, true, true),
  ('cccccccc-1200-4000-a000-000000000005', '{plomeria}', true, false, false),
  ('cccccccc-1200-4000-a000-000000000007', '{plomeria}', true, true, true),
  ('cccccccc-1200-4000-a000-000000000008', '{electricidad}', true, true, true);

update public.usuarios set estado = 'suspendida' where id in ('cccccccc-1200-4000-a000-000000000006', 'cccccccc-1200-4000-a000-000000000007');

insert into public.verificaciones (usuario_id, tipo, storage_path, estado)
values
  ('cccccccc-1200-4000-a000-000000000004', 'dni_frente', 'cccccccc-1200-4000-a000-000000000004/dni_frente-1791734400000.jpg', 'aprobado'),
  ('cccccccc-1200-4000-a000-000000000005', 'dni_dorso', 'cccccccc-1200-4000-a000-000000000005/dni_dorso-1791734400000.jpg', 'pendiente');

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, profesional_elegido_id)
select t.id::uuid, t.cliente::uuid, 'plomeria', t.titulo, 'Descripción de prueba',
       (select b.id from public.barrios b where b.slug = 'centro'), 'sin_apuro',
       t.estado::public.estado_trabajo, t.elegido::uuid
from (values
  ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000002', 'T1 abierto de C1', 'abierto', null),
  ('cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-a000-000000000002', 'T2 asignado a P1', 'asignado', 'cccccccc-1200-4000-a000-000000000004'),
  ('cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-a000-000000000003', 'T3 abierto de C2', 'abierto', null),
  ('cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-a000-000000000002', 'T4 abierto sin postulaciones', 'abierto', null),
  ('cccccccc-1200-4000-b000-000000000005', 'cccccccc-1200-4000-a000-000000000002', 'T5 asignado a P3', 'asignado', 'cccccccc-1200-4000-a000-000000000008'),
  ('cccccccc-1200-4000-b000-000000000006', 'cccccccc-1200-4000-a000-000000000006', 'T6 abierto de CS (suspendido)', 'abierto', null),
  ('cccccccc-1200-4000-b000-000000000007', 'cccccccc-1200-4000-a000-000000000002', 'T7 asignado a P3', 'asignado', 'cccccccc-1200-4000-a000-000000000008')
) as t (id, cliente, titulo, estado, elegido);

insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
values
  ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000004', 'Puedo ir mañana', 'enviada'),
  ('cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-a000-000000000004', 'Hecho', 'elegida'),
  ('cccccccc-1200-4000-b000-000000000005', 'cccccccc-1200-4000-a000-000000000008', 'Hecho', 'elegida'),
  ('cccccccc-1200-4000-b000-000000000006', 'cccccccc-1200-4000-a000-000000000007', 'Puedo ir', 'enviada'),
  ('cccccccc-1200-4000-b000-000000000006', 'cccccccc-1200-4000-a000-000000000008', 'Puedo ir', 'enviada'),
  ('cccccccc-1200-4000-b000-000000000007', 'cccccccc-1200-4000-a000-000000000004', 'Puedo ir', 'enviada'),
  ('cccccccc-1200-4000-b000-000000000007', 'cccccccc-1200-4000-a000-000000000008', 'Hecho', 'elegida');

-- Los contactos no se crean por la API (los registra la función de LAB-25): se cargan acá.
insert into public.contactos (cliente_id, profesional_id, origen)
values
  ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000004', 'perfil'),
  ('cccccccc-1200-4000-a000-000000000006', 'cccccccc-1200-4000-a000-000000000008', 'perfil'),
  ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000008', 'perfil');

insert into public.resenas (autor_id, profesional_id, puntaje, texto, created_at)
values
  ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000004', 5, 'Muy bien', now()),
  ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000004', 4, 'Bien, hace dos días', now() - interval '2 days');

insert into public.reportes (id, autor_id, objetivo_tipo, objetivo_id, motivo)
values
  ('cccccccc-1200-4000-c000-000000000001', 'cccccccc-1200-4000-a000-000000000002', 'perfil', 'cccccccc-1200-4000-a000-000000000004', 'otro'),
  ('cccccccc-1200-4000-c000-000000000002', 'cccccccc-1200-4000-a000-000000000003', 'perfil', 'cccccccc-1200-4000-a000-000000000004', 'otro');

insert into storage.objects (bucket_id, name)
values ('documentos', 'cccccccc-1200-4000-a000-000000000004/dni_frente-1791734400000.jpg');

-- ===========================================================================
-- Existencia de políticas
-- ===========================================================================

select cmp_ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = t.tabla),
  '>=', 1::bigint, 'la tabla ' || t.tabla || ' tiene políticas'
)
from (values
  ('barrios'), ('usuarios'), ('perfiles_profesionales'), ('verificaciones'), ('trabajos'),
  ('postulaciones'), ('contactos'), ('resenas'), ('reportes')
) as t (tabla);

select is(
  (select count(*) from pg_policies
   where schemaname = 'public' and qual = 'true' and tablename not in ('barrios', 'resenas')),
  0::bigint,
  'ninguna política usa using (true) salvo barrios y resenas'
);

-- ===========================================================================
-- barrios: todos leen, nadie escribe
-- ===========================================================================

reset role; select tests.anonimo();
select cmp_ok((select count(*) from public.barrios), '>=', 29::bigint, 'barrios: anon los lee');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select cmp_ok((select count(*) from public.barrios), '>=', 29::bigint, 'barrios: un cliente los lee');
select throws_ok(
  $$insert into public.barrios (id, nombre, slug, centro)
    select 30000, 'X', 'x', centro from public.barrios limit 1$$,
  '42501', null, 'barrios: un cliente no crea'
);
select throws_ok($$update public.barrios set nombre = 'X' where id = 1$$, '42501', null, 'barrios: un cliente no edita');
select throws_ok($$delete from public.barrios where id = 1$$, '42501', null, 'barrios: un cliente no borra');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select throws_ok($$update public.barrios set nombre = 'X' where id = 1$$, '42501', null, 'barrios: ni el admin edita por la API');

-- ===========================================================================
-- usuarios
-- ===========================================================================

reset role; select tests.anonimo();
select throws_ok($$select id from public.usuarios$$, '42501', null, 'usuarios: anon no lee la tabla');
select throws_ok($$select public.actualizar_whatsapp('+5492235550000')$$, '42501', null, 'usuarios: anon no ejecuta actualizar_whatsapp');
select is(
  (select apellido_inicial from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000004'),
  'G',
  'usuarios_publicos: anon ve a un profesional publicado con la inicial del apellido'
);
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000005'), 0::bigint, 'usuarios_publicos: anon no ve a un profesional sin publicar');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000009'), 0::bigint, 'usuarios_publicos: anon no ve a un cliente sin reseñas ni trabajos');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 1::bigint, 'usuarios_publicos: anon ve al autor de una reseña');
select ok((select barrio_id is null from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 'usuarios_publicos: del autor de una reseña no sale el barrio');
select ok((select barrio_id is not null from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000004'), 'usuarios_publicos: del profesional publicado sí sale el barrio');
select throws_ok($$select matricula_numero from public.perfiles_profesionales$$, '42501', null, 'perfiles: anon no lee matricula_numero');
select throws_ok($$select * from public.matricula_propia$$, '42501', null, 'matricula_propia: anon no la lee');
select throws_ok($$select whatsapp from public.usuarios_publicos$$, '42703', null, 'usuarios_publicos: no tiene la columna whatsapp');
select throws_ok($$select apellido from public.usuarios_publicos$$, '42703', null, 'usuarios_publicos: no tiene el apellido completo');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'), 1::bigint, 'usuarios: el cliente lee su fila');
select is((select whatsapp from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'), '+5492235551201', 'usuarios: el dueño lee su whatsapp');
select is((select count(*) from public.usuarios where id in ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000001')), 0::bigint, 'usuarios: no lee filas ajenas de la tabla');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000004'), 1::bigint, 'usuarios_publicos: un cliente ve a un profesional publicado');
select results_eq(
  $$update public.usuarios set nombre = 'Carlota' where id = 'cccccccc-1200-4000-a000-000000000002' returning nombre$$,
  $$values ('Carlota')$$,
  'usuarios: el dueño edita su nombre'
);
select throws_ok($$update public.usuarios set rol = 'admin' where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: el dueño no cambia su rol');
select throws_ok($$update public.usuarios set estado = 'suspendida' where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: el dueño no cambia su estado');
select throws_ok($$update public.usuarios set whatsapp = '+5492230000000' where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: el dueño no cambia el whatsapp con un UPDATE');
select throws_ok($$update public.usuarios set normas_version = 'v9' where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: el dueño no escribe normas_version');
select throws_ok($$update public.usuarios set normas_aceptadas_at = now() where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: el dueño no escribe normas_aceptadas_at');
select is_empty($$update public.usuarios set nombre = 'Hack' where id = 'cccccccc-1200-4000-a000-000000000003' returning 1$$, 'usuarios: no edita a otro usuario');
select lives_ok($$select public.actualizar_whatsapp('+5492235559999')$$, 'usuarios: actualizar_whatsapp acepta un E.164');
select is((select whatsapp from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'), '+5492235559999', 'usuarios: actualizar_whatsapp guardó el número');
select throws_ok($$select public.actualizar_whatsapp('223 555')$$, '23514', null, 'usuarios: actualizar_whatsapp rechaza un formato inválido');
select throws_ok($$select public.actualizar_whatsapp(null)$$, '23514', null, 'usuarios: actualizar_whatsapp rechaza null');
select lives_ok($$select public.aceptar_normas('v1')$$, 'usuarios: aceptar_normas guarda la versión');
select is((select normas_version from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'), 'v1', 'usuarios: normas_version quedó guardada');
select ok((select normas_aceptadas_at is not null from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'), 'usuarios: normas_aceptadas_at quedó guardada');
select throws_ok($$select public.aceptar_normas('')$$, '23514', null, 'usuarios: aceptar_normas rechaza una versión vacía');
select throws_ok($$delete from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000003'$$, '42501', null, 'usuarios: no borra la cuenta de otro');
select throws_ok($$delete from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000002'$$, '42501', null, 'usuarios: ni siquiera borra la propia por la API (lo hace un job de servidor)');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 1::bigint, 'usuarios_publicos: el dueño se ve a sí mismo');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 1::bigint, 'usuarios_publicos: un profesional ve al cliente de un trabajo abierto');
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000009'), 0::bigint, 'usuarios_publicos: un profesional no ve a un cliente sin trabajos');
select ok((select barrio_id is not null from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 'usuarios_publicos: un profesional publicado ve el barrio del cliente de un trabajo abierto');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok($$select public.actualizar_whatsapp('+5492235558888')$$, '42501', null, 'usuarios: una cuenta suspendida no ejecuta actualizar_whatsapp');
select throws_ok($$select public.aceptar_normas('v1')$$, '42501', null, 'usuarios: una cuenta suspendida no ejecuta aceptar_normas');
select throws_ok($$update public.usuarios set estado = 'activa' where id = 'cccccccc-1200-4000-a000-000000000006' returning 1$$, '42501', null, 'usuarios: una cuenta suspendida no se reactiva sola (LAB-50: sin privilegio de update sobre estado)');
select is_empty($$update public.usuarios set nombre = 'Hack' where id = 'cccccccc-1200-4000-a000-000000000006' returning 1$$, 'usuarios: una cuenta suspendida no edita su perfil');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.usuarios where id in ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000004')), 3::bigint, 'usuarios: el admin lee todas las filas');
-- LAB-32: el estado de una cuenta solo cambia por las RPC de moderación (ni el admin lo cambia por update).
select lives_ok(
  $$select public.suspender_cuenta_admin('cccccccc-1200-4000-a000-000000000009', 'Prueba de políticas')$$,
  'usuarios: el admin suspende una cuenta por la RPC'
);
select results_eq(
  $$select estado::text from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000009'$$,
  $$values ('suspendida')$$,
  'usuarios: la RPC deja la cuenta suspendida'
);
select throws_ok($$update public.usuarios set estado = 'activa' where id = 'cccccccc-1200-4000-a000-000000000009'$$, '42501', null, 'usuarios: el admin no cambia el estado por update directo');
select lives_ok(
  $$select public.reactivar_cuenta_admin('cccccccc-1200-4000-a000-000000000009', 'Prueba cerrada')$$,
  'usuarios: el admin reactiva una cuenta por la RPC'
);
select results_eq(
  $$select estado::text from public.usuarios where id = 'cccccccc-1200-4000-a000-000000000009'$$,
  $$values ('activa')$$,
  'usuarios: la RPC deja la cuenta activa'
);
select throws_ok($$update public.usuarios set rol = 'admin' where id = 'cccccccc-1200-4000-a000-000000000009'$$, '42501', null, 'usuarios: ni el admin cambia roles por la API');
select throws_ok($$update public.usuarios set whatsapp = '+5492230000000' where id = 'cccccccc-1200-4000-a000-000000000009'$$, '42501', null, 'usuarios: ni el admin cambia el whatsapp de otro por la API');

-- ===========================================================================
-- perfiles_profesionales
-- ===========================================================================

reset role; select tests.anonimo();
select is(
  (select count(*) from public.perfiles_profesionales where usuario_id in ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000005', 'cccccccc-1200-4000-a000-000000000008', 'cccccccc-1200-4000-a000-000000000007')),
  2::bigint,
  'perfiles: anon ve solo los publicados (P1 y P3), no el sin verificar ni el de la cuenta suspendida'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'), 0::bigint, 'perfiles: un cliente no ve un perfil sin publicar');
select is((select count(*) from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000004'), 1::bigint, 'perfiles: un cliente ve un perfil publicado');
select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad) values ('cccccccc-1200-4000-a000-000000000002', '{plomeria}', true)$$,
  '23514', null, 'perfiles: un cliente no puede crear un perfil profesional'
);
select throws_ok($$delete from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000004'$$, '42501', null, 'perfiles: nadie borra un perfil por la API (cliente)');
select throws_ok($$select matricula_numero from public.perfiles_profesionales$$, '42501', null, 'perfiles: un cliente no lee matricula_numero de la tabla');
select throws_ok($$select * from public.perfiles_profesionales$$, '42501', null, 'perfiles: un select * incluye matricula_numero y se rechaza');
select is((select count(*) from public.matricula_propia), 0::bigint, 'matricula_propia: un cliente no ve ninguna matrícula');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000005');
select is((select count(*) from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'), 1::bigint, 'perfiles: el dueño ve su perfil aunque no esté publicado');
select results_eq(
  $$update public.perfiles_profesionales set descripcion = 'Trabajo prolijo' where usuario_id = 'cccccccc-1200-4000-a000-000000000005' returning descripcion$$,
  $$values ('Trabajo prolijo')$$,
  'perfiles: el dueño edita su descripción'
);
select throws_ok($$update public.perfiles_profesionales set publicado = true where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se pone publicado = true');
select throws_ok($$update public.perfiles_profesionales set identidad_verificada = true where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se pone identidad_verificada = true');
select throws_ok($$update public.perfiles_profesionales set antecedentes_ok = true where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se pone antecedentes_ok = true');
select throws_ok($$update public.perfiles_profesionales set matriculado = true where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se pone matriculado = true');
select throws_ok($$update public.perfiles_profesionales set promedio = 5 where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se cambia el promedio');
select throws_ok($$update public.perfiles_profesionales set cantidad_resenas = 99 where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se cambia cantidad_resenas');
select throws_ok($$update public.perfiles_profesionales set prioridad = 9 where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: un profesional no se cambia la prioridad');
select is_empty($$update public.perfiles_profesionales set descripcion = 'Hack' where usuario_id = 'cccccccc-1200-4000-a000-000000000004' returning 1$$, 'perfiles: un profesional no edita el perfil de otro');
select throws_ok($$delete from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: el dueño no borra su perfil por la API');
select lives_ok($$update public.perfiles_profesionales set matricula_numero = 'MP-1234' where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, 'perfiles: el dueño carga su matrícula');
select is((select matricula_numero from public.matricula_propia where usuario_id = 'cccccccc-1200-4000-a000-000000000005'), 'MP-1234', 'matricula_propia: el dueño lee su matrícula');
select is((select count(*) from public.matricula_propia where usuario_id = 'cccccccc-1200-4000-a000-000000000004'), 0::bigint, 'matricula_propia: no ve la de otro');
select throws_ok($$select matricula_numero from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: ni el dueño lee matricula_numero de la tabla (usa la vista)');
select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad) values ('cccccccc-1200-4000-a000-000000000004', '{gas}', true)$$,
  '42501', null, 'perfiles: un profesional no crea un perfil a nombre de otro'
);

reset role; select tests.como('cccccccc-1200-4000-a000-00000000000a');
select lives_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad) values ('cccccccc-1200-4000-a000-00000000000a', '{pintura}', true)$$,
  'perfiles: un profesional crea su perfil'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'), 1::bigint, 'perfiles: el admin ve un perfil sin publicar');
select results_eq(
  $$update public.perfiles_profesionales set identidad_verificada = true, antecedentes_ok = true where usuario_id = 'cccccccc-1200-4000-a000-00000000000a' returning publicado$$,
  $$values (true)$$,
  'perfiles: el admin da las insignias y el perfil se publica solo'
);
select throws_ok($$update public.perfiles_profesionales set publicado = true where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: ni el admin fuerza publicado por la API');
select throws_ok($$delete from public.perfiles_profesionales where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'perfiles: ni el admin borra perfiles por la API');
select is((select count(*) from public.matricula_propia where usuario_id in ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000005')), 2::bigint, 'matricula_propia: el admin la lee de cualquiera');

-- ===========================================================================
-- verificaciones (DNI y antecedentes: lo más sensible)
-- ===========================================================================

reset role; select tests.como('cccccccc-1200-4000-a000-000000000005');
-- LAB-43: el dueño no inserta directo. Solo lo hace registrar_documento (security definer).
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'dni_frente', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400001.jpg')$$,
  '42501', null, 'verificaciones: el dueño no inserta directo sin consentimiento'
);
reset role;
update public.usuarios
set datos_sensibles_version = '2026-10', datos_sensibles_consentido_at = now()
where id = 'cccccccc-1200-4000-a000-000000000005';
select tests.como('cccccccc-1200-4000-a000-000000000005');
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'dni_frente', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400001.jpg')$$,
  '42501', null, 'verificaciones: el dueño no inserta directo ni con consentimiento vigente'
);
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000004', 'dni_dorso', 'cccccccc-1200-4000-a000-000000000004/dni_dorso-1791734400001.jpg')$$,
  '42501', null, 'verificaciones: no sube documentos a nombre de otro'
);
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path, estado)
    values ('cccccccc-1200-4000-a000-000000000005', 'antecedentes', 'cccccccc-1200-4000-a000-000000000005/antecedentes-1791734400001.pdf', 'aprobado')$$,
  '42501', null, 'verificaciones: el dueño no se auto-aprueba al insertar'
);
-- Las constraints (unicidad, formato de ruta) se prueban como superusuario: el insert directo ya
-- queda denegado por privilegios, así que llegarían a la denegación y no a la constraint.
reset role;
insert into public.verificaciones (usuario_id, tipo, storage_path)
values ('cccccccc-1200-4000-a000-000000000005', 'dni_frente', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400001.jpg');
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'dni_frente', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400009.jpg')$$,
  '23505', null, 'verificaciones: un solo documento pendiente por tipo'
);
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'antecedentes', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400009.jpg')$$,
  '23514', null, 'verificaciones: la ruta tiene que corresponder al tipo'
);
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'matricula', 'cccccccc-1200-4000-a000-000000000005/matricula-1791734400009.exe')$$,
  '23514', null, 'verificaciones: la ruta tiene que tener extensión permitida'
);
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000005', 'matricula', 'cccccccc-1200-4000-a000-000000000005/../cccccccc-1200-4000-a000-000000000004/matricula-1791734400009.pdf')$$,
  '23514', null, 'verificaciones: la ruta no admite recorridos de carpetas'
);
select tests.como('cccccccc-1200-4000-a000-000000000005');
select is_empty($$select * from public.verificaciones$$, 'verificaciones: el dueño no puede leer la tabla');
select is_empty($$select storage_path from public.verificaciones where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, 'verificaciones: el profesional no lee el storage_path de sus propias verificaciones');
select is((select count(*) from public.mis_verificaciones), 2::bigint, 'mis_verificaciones: el dueño ve el estado de sus 2 documentos');
select throws_ok($$select storage_path from public.mis_verificaciones$$, '42703', null, 'mis_verificaciones: la vista no expone storage_path');
select throws_ok($$update public.verificaciones set estado = 'aprobado' where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', 'permission denied for table verificaciones', 'verificaciones: el dueño no se aprueba solo');
select throws_ok($$delete from public.verificaciones where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'verificaciones: nadie borra por la API (dueño)');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is((select count(*) from public.mis_verificaciones), 1::bigint, 'mis_verificaciones: solo ve las propias');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is_empty($$select * from public.verificaciones$$, 'verificaciones: un cliente no lee verificaciones de nadie');
select throws_ok(
  $$insert into public.verificaciones (usuario_id, tipo, storage_path)
    values ('cccccccc-1200-4000-a000-000000000002', 'dni_frente', 'cccccccc-1200-4000-a000-000000000002/dni_frente-1791734400001.jpg')$$,
  '42501', null, 'verificaciones: un cliente no sube documentos'
);
select is((select count(*) from public.mis_verificaciones), 0::bigint, 'mis_verificaciones: un cliente no tiene filas');

reset role; select tests.anonimo();
select throws_ok($$select * from public.verificaciones$$, '42501', null, 'verificaciones: anon no lee la tabla');
select throws_ok($$select * from public.mis_verificaciones$$, '42501', null, 'mis_verificaciones: anon no lee la vista');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.verificaciones where usuario_id in ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000005')), 3::bigint, 'verificaciones: el admin lee todo');
select throws_ok(
  $$update public.verificaciones set estado = 'rechazado', motivo_rechazo = 'Foto borrosa', revisado_por = 'cccccccc-1200-4000-a000-000000000001', revisado_at = now()
    where usuario_id = 'cccccccc-1200-4000-a000-000000000005' and tipo = 'dni_dorso'$$,
  '42501', 'permission denied for table verificaciones',
  'verificaciones: el admin no rechaza por la API (solo decidir_documento)'
);
select throws_ok(
  $$update public.verificaciones set revisado_por = 'cccccccc-1200-4000-a000-000000000002' where usuario_id = 'cccccccc-1200-4000-a000-000000000005' and tipo = 'dni_dorso'$$,
  '42501', null, 'verificaciones: el admin firma la revisión con su propio id'
);
select throws_ok($$delete from public.verificaciones where usuario_id = 'cccccccc-1200-4000-a000-000000000005'$$, '42501', null, 'verificaciones: nadie borra por la API (admin)');

-- ===========================================================================
-- trabajos
-- ===========================================================================

reset role; select tests.anonimo();
select throws_ok($$select id from public.trabajos$$, '42501', null, 'trabajos: anon no los ve');
select throws_ok($$select id from public.contactos$$, '42501', null, 'contactos: anon no los ve');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000005');
select is(
  (select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-b000-000000000005', 'cccccccc-1200-4000-b000-000000000006', 'cccccccc-1200-4000-b000-000000000007')),
  0::bigint,
  'trabajos: un profesional sin verificar no ve ningún trabajo'
);
select is((select count(*) from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000009'), 0::bigint, 'usuarios_publicos: un profesional sin verificar no ve clientes sin relación');
select ok((select barrio_id is null from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000003'), 'usuarios_publicos: un profesional sin verificar no ve el barrio de clientes con trabajos abiertos');
select ok((select barrio_id is null from public.usuarios_publicos where id = 'cccccccc-1200-4000-a000-000000000002'), 'usuarios_publicos: ni el de otro cliente con trabajos abiertos');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000007');
select is(
  (select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-b000-000000000005', 'cccccccc-1200-4000-b000-000000000006', 'cccccccc-1200-4000-b000-000000000007')),
  0::bigint,
  'trabajos: un profesional suspendido no ve ningún trabajo'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is(
  (select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-b000-000000000005')),
  4::bigint,
  'trabajos: un profesional ve los abiertos (T1, T3, T4) y el que le asignaron (T2)'
);
select is((select count(*) from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000005'), 0::bigint, 'trabajos: un profesional no ve uno asignado a otro');
select is_empty($$update public.trabajos set titulo = 'Hack' where id = 'cccccccc-1200-4000-b000-000000000002' returning 1$$, 'trabajos: el profesional elegido no edita el trabajo');
select throws_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia)
    select 'cccccccc-1200-4000-a000-000000000004', 'plomeria', 'x', 'x', id, 'sin_apuro' from public.barrios limit 1$$,
  '42501', null, 'trabajos: un profesional no publica trabajos'
);
select is_empty($$delete from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000003' returning 1$$, 'trabajos: un profesional no borra trabajos');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000003');
select is((select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-b000-000000000005')), 0::bigint, 'trabajos: un cliente no ve los de otro cliente');
select is((select count(*) from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000003'), 1::bigint, 'trabajos: un cliente ve el suyo');
select is_empty($$update public.trabajos set titulo = 'Hack' where id = 'cccccccc-1200-4000-b000-000000000001' returning 1$$, 'trabajos: un cliente no edita el de otro');
select is_empty($$delete from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000004' returning 1$$, 'trabajos: un cliente no borra el de otro');
select throws_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia)
    select 'cccccccc-1200-4000-a000-000000000002', 'plomeria', 'x', 'x', id, 'sin_apuro' from public.barrios limit 1$$,
  '42501', null, 'trabajos: un cliente no publica a nombre de otro'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-b000-000000000004', 'cccccccc-1200-4000-b000-000000000005')), 4::bigint, 'trabajos: el dueño ve los suyos en cualquier estado');
select lives_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia)
    select 'cccccccc-1200-4000-a000-000000000002', 'plomeria', 'Nuevo trabajo', 'Descripción', id, 'sin_apuro' from public.barrios where slug = 'centro'$$,
  'trabajos: un cliente publica un trabajo'
);
select throws_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
    select 'cccccccc-1200-4000-a000-000000000002', 'plomeria', 'x', 'x', id, 'sin_apuro', 'asignado' from public.barrios limit 1$$,
  '42501', null, 'trabajos: no se crea directamente en otro estado'
);
select results_eq(
  $$update public.trabajos set titulo = 'T1 editado' where id = 'cccccccc-1200-4000-b000-000000000001' returning titulo$$,
  $$values ('T1 editado')$$,
  'trabajos: el dueño edita su trabajo'
);
select throws_ok(
  $$update public.trabajos set profesional_elegido_id = 'cccccccc-1200-4000-a000-000000000005', estado = 'asignado' where id = 'cccccccc-1200-4000-b000-000000000004'$$,
  '42501', null, 'trabajos: no se asigna a alguien que no fue elegido en una postulación'
);
select is_empty($$delete from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000001' returning 1$$, 'trabajos: no se borra un trabajo con postulaciones');
select results_eq(
  $$delete from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000004' returning id$$,
  $$values ('cccccccc-1200-4000-b000-000000000004'::uuid)$$,
  'trabajos: el dueño borra un trabajo sin postulaciones'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$insert into public.trabajos (cliente_id, oficio, titulo, descripcion, barrio_id, urgencia)
    select 'cccccccc-1200-4000-a000-000000000006', 'plomeria', 'x', 'x', id, 'sin_apuro' from public.barrios limit 1$$,
  '42501', null, 'trabajos: un usuario suspendido no puede crear trabajos'
);
select is_empty($$update public.trabajos set titulo = 'Hack' where id = 'cccccccc-1200-4000-b000-000000000006' returning 1$$, 'trabajos: un usuario suspendido no edita sus trabajos');
select is((select count(*) from public.trabajos where id = 'cccccccc-1200-4000-b000-000000000006'), 1::bigint, 'trabajos: un usuario suspendido todavía ve los suyos');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.trabajos where id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-b000-000000000005')), 4::bigint, 'trabajos: el admin los ve todos');

-- ===========================================================================
-- postulaciones
-- ===========================================================================

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is((select count(*) from public.postulaciones where trabajo_id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000005')), 2::bigint, 'postulaciones: el autor ve las suyas');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.postulaciones where trabajo_id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000005')), 3::bigint, 'postulaciones: el cliente dueño ve las de sus trabajos');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000003');
select is((select count(*) from public.postulaciones where trabajo_id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000005')), 0::bigint, 'postulaciones: otro cliente no ve las de un trabajo ajeno');
select throws_ok($$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' returning 1$$, '42501', null, 'postulaciones: otro cliente no elige en un trabajo ajeno (sin update directo de estado)');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000005');
select is((select count(*) from public.postulaciones where trabajo_id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000005')), 0::bigint, 'postulaciones: otro profesional no ve las ajenas');
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000005', 'Hola')$$,
  '42501', null, 'postulaciones: un profesional con perfil sin publicar no se postula'
);

reset role; select tests.anonimo();
select throws_ok($$select id from public.postulaciones$$, '42501', null, 'postulaciones: anon no las ve');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000008');
select lives_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000008', 'Puedo hoy')$$,
  'postulaciones: un profesional publicado se postula a un trabajo abierto'
);
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000008', 'Otra vez')$$,
  '23505', null, 'postulaciones: una sola por trabajo'
);
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-a000-000000000008', 'Hola')$$,
  '42501', null, 'postulaciones: no se postula a un trabajo que no está abierto'
);
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000003', 'cccccccc-1200-4000-a000-000000000004', 'Hola')$$,
  '42501', null, 'postulaciones: no se postula a nombre de otro'
);
select throws_ok(
  $$update public.postulaciones set estado = 'retirada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000008' returning estado::text$$,
  '42501', null, 'postulaciones: el autor no retira con update directo (se retira con retirar_postulacion)'
);
select throws_ok(
  $$update public.postulaciones set estado = 'retirada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000008' returning 1$$,
  '42501', null, 'postulaciones: una retirada no se vuelve a modificar (ni por update directo)'
);
select throws_ok($$delete from public.postulaciones where trabajo_id = 'cccccccc-1200-4000-b000-000000000005'$$, '42501', null, 'postulaciones: nadie las borra (autor)');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000007');
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000007', 'Hola')$$,
  '42501', null, 'postulaciones: un usuario suspendido no puede postularse'
);
select throws_ok(
  $$update public.postulaciones set estado = 'retirada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000006' and profesional_id = 'cccccccc-1200-4000-a000-000000000007' returning 1$$,
  '42501', null, 'postulaciones: un usuario suspendido no retira la suya'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000006' and profesional_id = 'cccccccc-1200-4000-a000-000000000008' returning 1$$,
  '42501', null, 'postulaciones: un cliente suspendido no elige'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje) values ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-a000-000000000002', 'Hola')$$,
  '42501', null, 'postulaciones: un cliente no se postula'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000004'$$,
  '42501', null, 'postulaciones: el autor no se elige a sí mismo'
);
select throws_ok(
  $$update public.postulaciones set estado = 'retirada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000002' and profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning 1$$,
  '42501', null, 'postulaciones: el autor no retira una que ya fue elegida (ni por update directo)'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select throws_ok(
  $$update public.postulaciones set estado = 'descartada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning estado::text$$,
  '42501', null, 'postulaciones: el cliente dueño no descarta con update directo (lo hace elegir_postulante)'
);
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning estado::text$$,
  '42501', null, 'postulaciones: el cliente dueño no elige con update directo (lo hace elegir_postulante)'
);
select throws_ok(
  $$update public.postulaciones set estado = 'enviada' where trabajo_id = 'cccccccc-1200-4000-b000-000000000001' and profesional_id = 'cccccccc-1200-4000-a000-000000000004'$$,
  '42501', null, 'postulaciones: el cliente solo elige o descarta'
);
select throws_ok($$delete from public.postulaciones where trabajo_id = 'cccccccc-1200-4000-b000-000000000001'$$, '42501', null, 'postulaciones: nadie las borra (cliente)');
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000007' and profesional_id = 'cccccccc-1200-4000-a000-000000000004'$$,
  '42501', null, 'postulaciones: no se elige en un trabajo que ya no está abierto'
);

reset role;
select throws_ok(
  $$update public.postulaciones set estado = 'elegida' where trabajo_id = 'cccccccc-1200-4000-b000-000000000007' and profesional_id = 'cccccccc-1200-4000-a000-000000000004'$$,
  '23505', null, 'postulaciones: el índice único impide dos elegidas en el mismo trabajo (aun salteando RLS)'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.postulaciones where trabajo_id in ('cccccccc-1200-4000-b000-000000000001', 'cccccccc-1200-4000-b000-000000000002', 'cccccccc-1200-4000-b000-000000000005')), 4::bigint, 'postulaciones: el admin las ve todas');

-- ===========================================================================
-- contactos
-- ===========================================================================

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.contactos where profesional_id = 'cccccccc-1200-4000-a000-000000000004'), 1::bigint, 'contactos: el cliente ve los suyos');
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000005', 'perfil')$$,
  '42501', null, 'contactos: un cliente no inserta contactos por la API (grant de insert revocado)'
);
select throws_ok($$update public.contactos set origen = 'perfil'$$, '42501', null, 'contactos: nadie los edita');
select throws_ok($$delete from public.contactos$$, '42501', null, 'contactos: nadie los borra');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000003');
select is((select count(*) from public.contactos where cliente_id = 'cccccccc-1200-4000-a000-000000000002'), 0::bigint, 'contactos: otro cliente no ve los ajenos');
select is((select count(*) from public.contactos where cliente_id = 'cccccccc-1200-4000-a000-000000000003'), 1::bigint, 'contactos: el cliente ve el suyo');
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'contactos: un cliente no inserta contactos por la API (lo hace la función de LAB-25)'
);
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000008', 'perfil')$$,
  '42501', null, 'contactos: no se registra a nombre de otro cliente'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is((select count(*) from public.contactos where profesional_id = 'cccccccc-1200-4000-a000-000000000004'), 0::bigint, 'contactos: el profesional no ve quién lo contactó');
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000008', 'perfil')$$,
  '42501', null, 'contactos: un profesional no crea contactos'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$insert into public.contactos (cliente_id, profesional_id, origen) values ('cccccccc-1200-4000-a000-000000000006', 'cccccccc-1200-4000-a000-000000000004', 'perfil')$$,
  '42501', null, 'contactos: un usuario suspendido no crea contactos'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.contactos where profesional_id in ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000008')), 3::bigint, 'contactos: el admin los ve todos');

-- ===========================================================================
-- resenas
-- ===========================================================================

reset role; select tests.anonimo();
select is((select count(*) from public.resenas where profesional_id = 'cccccccc-1200-4000-a000-000000000004'), 2::bigint, 'resenas: anon las lee');
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000008', 5)$$,
  '42501', null, 'resenas: anon no crea'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select lives_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje, texto) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000008', 5, 'Elegido en mi trabajo')$$,
  'resenas: un cliente con una postulación elegida en su trabajo reseña'
);
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000004', 4)$$,
  '23505', null, 'resenas: una sola por cliente y profesional'
);
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000005', 4)$$,
  '42501', null, 'resenas: sin contacto ni postulación elegida no se puede reseñar'
);
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000008', 1)$$,
  '42501', null, 'resenas: no se reseña a nombre de otro'
);
select results_eq(
  $$update public.resenas set puntaje = 3 where autor_id = 'cccccccc-1200-4000-a000-000000000002' and profesional_id = 'cccccccc-1200-4000-a000-000000000008' returning puntaje$$,
  $$values (3::smallint)$$,
  'resenas: el autor edita la suya dentro de las 24 h'
);
select throws_ok($$update public.resenas set autor_id = 'cccccccc-1200-4000-a000-000000000003' where autor_id = 'cccccccc-1200-4000-a000-000000000002' and profesional_id = 'cccccccc-1200-4000-a000-000000000008'$$, '42501', null, 'resenas: no se cambia el autor');
select throws_ok($$delete from public.resenas where autor_id = 'cccccccc-1200-4000-a000-000000000003' returning 1$$, '42501', null, 'resenas: nadie borra reseñas por la API (LAB-31 endurecer)');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000003');
select lives_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000003', 'cccccccc-1200-4000-a000-000000000008', 4)$$,
  'resenas: un cliente con un contacto registrado reseña'
);
select is_empty($$update public.resenas set puntaje = 1 where autor_id = 'cccccccc-1200-4000-a000-000000000002' returning 1$$, 'resenas: no se edita la de otro');
select is_empty(
  $$update public.resenas set puntaje = 1 where autor_id = 'cccccccc-1200-4000-a000-000000000003' and profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning 1$$,
  'resenas: pasadas las 24 h el autor ya no puede editar'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000009');
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000009', 'cccccccc-1200-4000-a000-000000000008', 5)$$,
  '42501', null, 'resenas: un cliente sin relación con el profesional no reseña'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000006', 'cccccccc-1200-4000-a000-000000000008', 5)$$,
  '42501', null, 'resenas: un usuario suspendido no reseña, aunque tenga un contacto'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje) values ('cccccccc-1200-4000-a000-000000000004', 'cccccccc-1200-4000-a000-000000000008', 5)$$,
  '42501', null, 'resenas: un profesional no reseña'
);
select throws_ok($$delete from public.resenas where profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning 1$$, '42501', null, 'resenas: el profesional no borra las que recibió');

-- LAB-31 (endurecer): el autor no borra su reseña, ni dentro de las 24 h. Borrar y reinsertar
-- cambiaba la calificación fuera de la ventana.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select throws_ok(
  $$delete from public.resenas where autor_id = 'cccccccc-1200-4000-a000-000000000002' and profesional_id = 'cccccccc-1200-4000-a000-000000000008' returning 1$$,
  '42501', null,
  'resenas: el autor no borra su reseña, ni dentro de las 24 h'
);

-- Sin grant de delete para authenticated, el admin tampoco borra por la API. Si LAB-32 necesita
-- borrar reseñas, lo resuelve con una vía explícita (service role) o un grant nuevo.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select throws_ok(
  $$delete from public.resenas where autor_id = 'cccccccc-1200-4000-a000-000000000003' and profesional_id = 'cccccccc-1200-4000-a000-000000000004' returning 1$$,
  '42501', null,
  'resenas: ni el admin borra por la API (sin grant de delete, LAB-31 endurecer)'
);

-- LAB-31 (endurecer): trigger de moderación, filtro de contacto y elegido del trabajo.
-- Datos extra (como postgres): un trabajo de C1 asignado a P2, con postulación elegida. Y un
-- contacto de C3 con P2 para que pueda reseñar.
reset role;
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, profesional_elegido_id)
values ('cccccccc-1200-4000-b000-000000000008', 'cccccccc-1200-4000-a000-000000000002', 'plomeria', 'T8 asignado a P2', 'Descripción de prueba',
        (select b.id from public.barrios b where b.slug = 'centro'), 'sin_apuro', 'asignado', 'cccccccc-1200-4000-a000-000000000005');
insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
values ('cccccccc-1200-4000-b000-000000000008', 'cccccccc-1200-4000-a000-000000000005', 'Hecho', 'elegida');
insert into public.contactos (cliente_id, profesional_id, origen)
values ('cccccccc-1200-4000-a000-000000000009', 'cccccccc-1200-4000-a000-000000000005', 'perfil');

-- Insert directo por PostgREST de 1 estrella: el trigger abre el reporte de moderación.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000009');
select lives_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje, texto) values ('cccccccc-1200-4000-a000-000000000009', 'cccccccc-1200-4000-a000-000000000005', 1, 'Muy mal servicio')$$,
  'resenas: un insert directo de 1 estrella se publica'
);
reset role;
select is(
  (select count(*) from public.reportes r
   join public.resenas res on res.id = r.objetivo_id
   where r.objetivo_tipo = 'resena' and res.autor_id = 'cccccccc-1200-4000-a000-000000000009' and res.profesional_id = 'cccccccc-1200-4000-a000-000000000005'),
  1::bigint,
  'resenas: un insert directo de 1 estrella genera el reporte de moderación'
);

-- Un update a 2 estrellas no duplica el reporte.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000009');
select lives_ok(
  $$update public.resenas set puntaje = 2 where autor_id = 'cccccccc-1200-4000-a000-000000000009' and profesional_id = 'cccccccc-1200-4000-a000-000000000005'$$,
  'resenas: el autor edita a 2 estrellas dentro de las 24 h'
);
reset role;
select is(
  (select count(*) from public.reportes r
   join public.resenas res on res.id = r.objetivo_id
   where r.objetivo_tipo = 'resena' and res.autor_id = 'cccccccc-1200-4000-a000-000000000009' and res.profesional_id = 'cccccccc-1200-4000-a000-000000000005'),
  1::bigint,
  'resenas: editar a 2 estrellas no duplica el reporte'
);

-- Filtro de contacto en la base: teléfono o email en el texto no se guardan, ni al editar.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000009');
select throws_ok(
  $$update public.resenas set texto = 'Llamame al 2234567890' where autor_id = 'cccccccc-1200-4000-a000-000000000009' and profesional_id = 'cccccccc-1200-4000-a000-000000000005'$$,
  '23514', null,
  'resenas: el texto con un teléfono no se guarda'
);
select throws_ok(
  $$update public.resenas set texto = 'Escribime a pedro@ejemplo.com' where autor_id = 'cccccccc-1200-4000-a000-000000000009' and profesional_id = 'cccccccc-1200-4000-a000-000000000005'$$,
  '23514', null,
  'resenas: el texto con un email no se guarda'
);

-- Si hay trabajo, el profesional reseñado tiene que ser el elegido de ese trabajo.
reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje, trabajo_id) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000005', 4, 'cccccccc-1200-4000-b000-000000000002')$$,
  '42501', null,
  'resenas: con un trabajo de otro profesional elegido, no se reseña'
);
select lives_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje, trabajo_id) values ('cccccccc-1200-4000-a000-000000000002', 'cccccccc-1200-4000-a000-000000000005', 4, 'cccccccc-1200-4000-b000-000000000008')$$,
  'resenas: con el trabajo del profesional elegido sí se reseña'
);

-- ===========================================================================
-- reportes
-- ===========================================================================

reset role; select tests.anonimo();
select throws_ok($$select id from public.reportes$$, '42501', null, 'reportes: anon no los ve');
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values (null, 'perfil', 'cccccccc-1200-4000-a000-000000000004', 'estafa')$$,
  '42501', null, 'reportes: anon no reporta'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select is((select count(*) from public.reportes where id in ('cccccccc-1200-4000-c000-000000000001', 'cccccccc-1200-4000-c000-000000000002')), 1::bigint, 'reportes: el autor ve solo los suyos');
select lives_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo, detalle) values ('cccccccc-1200-4000-a000-000000000002', 'perfil', 'cccccccc-1200-4000-a000-000000000008', 'datos_falsos', 'No coincide la foto')$$,
  'reportes: un cliente reporta'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values ('cccccccc-1200-4000-a000-000000000002', 'perfil', 'cccccccc-1200-4000-a000-000000000005', 'otro')$$,
  'P0002', 'El contenido reportado no existe', 'reportes: un perfil sin publicar da el mismo error que uno inexistente'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values ('cccccccc-1200-4000-a000-000000000002', 'perfil', 'cccccccc-1200-4000-a000-00000000ffff', 'otro')$$,
  'P0002', 'El contenido reportado no existe', 'reportes: un perfil inexistente da el mismo error'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values ('cccccccc-1200-4000-a000-000000000003', 'perfil', 'cccccccc-1200-4000-a000-000000000008', 'otro')$$,
  '42501', null, 'reportes: no se reporta a nombre de otro'
);
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo, estado) values ('cccccccc-1200-4000-a000-000000000003', 'perfil', 'cccccccc-1200-4000-a000-000000000008', 'otro', 'resuelto')$$,
  '42501', null, 'reportes: no se crea ya resuelto'
);
select is_empty($$update public.reportes set estado = 'resuelto' where id = 'cccccccc-1200-4000-c000-000000000001' returning 1$$, 'reportes: el autor no cambia el estado');
select throws_ok($$delete from public.reportes where id = 'cccccccc-1200-4000-c000-000000000001'$$, '42501', null, 'reportes: nadie los borra (autor)');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select is((select count(*) from public.reportes where id in ('cccccccc-1200-4000-c000-000000000001', 'cccccccc-1200-4000-c000-000000000002')), 0::bigint, 'reportes: el reportado no ve quién lo reportó');
select lives_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values ('cccccccc-1200-4000-a000-000000000004', 'trabajo', 'cccccccc-1200-4000-b000-000000000003', 'contenido_inapropiado')$$,
  'reportes: un profesional también reporta'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$insert into public.reportes (autor_id, objetivo_tipo, objetivo_id, motivo) values ('cccccccc-1200-4000-a000-000000000006', 'perfil', 'cccccccc-1200-4000-a000-000000000004', 'otro')$$,
  '42501', null, 'reportes: un usuario suspendido no reporta'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is((select count(*) from public.reportes where id in ('cccccccc-1200-4000-c000-000000000001', 'cccccccc-1200-4000-c000-000000000002')), 2::bigint, 'reportes: el admin los ve todos');
select results_eq(
  $$update public.reportes set estado = 'resuelto', resuelto_por = 'cccccccc-1200-4000-a000-000000000001' where id = 'cccccccc-1200-4000-c000-000000000001' returning estado::text$$,
  $$values ('resuelto')$$,
  'reportes: el admin los resuelve'
);
select throws_ok(
  $$update public.reportes set resuelto_por = 'cccccccc-1200-4000-a000-000000000002' where id = 'cccccccc-1200-4000-c000-000000000002'$$,
  '42501', null, 'reportes: el admin firma la resolución con su propio id'
);
select throws_ok($$delete from public.reportes where id = 'cccccccc-1200-4000-c000-000000000001'$$, '42501', null, 'reportes: nadie los borra (admin)');

-- ===========================================================================
-- Privilegios: funciones internas, tablas y columnas
-- ===========================================================================

reset role;

select ok(
  not has_function_privilege(r.rol, f.fn, 'execute'),
  r.rol || ' no puede ejecutar ' || f.fn
)
from (values ('anon'), ('authenticated')) as r (rol)
cross join (values
  ('public.actualizar_updated_at()'),
  ('public.perfiles_profesionales_validar()'),
  ('public.usuarios_estado_cambiado()'),
  ('privado.recalcular_resenas_de(uuid)'),
  ('public.resenas_recalcular()'),
  ('privado.resenas_validar_texto()'),
  ('privado.resenas_moderar()'),
  ('public.al_crear_usuario()'),
  ('privado.usuarios_proteger_columnas()'),
  ('privado.perfiles_proteger_insignias()')
) as f (fn);

-- LAB-43: las funciones de consentimiento solo las ejecuta authenticated (no public ni anon).
select ok(
  not has_function_privilege('anon', f.fn, 'execute') and has_function_privilege('authenticated', f.fn, 'execute'),
  'privado: ' || f.fn || ' la ejecuta solo authenticated'
)
from (values ('privado.version_legales_vigente()'), ('privado.consentimiento_datos_vigente()')) as f (fn);

-- LAB-43: el dueño no inserta directo en verificaciones (ni tabla ni columnas).
select ok(
  not has_table_privilege('authenticated', 'public.verificaciones', 'insert')
  and not has_column_privilege('authenticated', 'public.verificaciones', 'storage_path', 'insert'),
  'verificaciones: authenticated no tiene insert directo'
);

select hasnt_function('public', 'recalcular_resenas_de', array['uuid'], 'recalcular_resenas_de ya no está en public (no sale como RPC en los tipos)');
select has_function('privado', 'recalcular_resenas_de', array['uuid'], 'recalcular_resenas_de quedó en el esquema privado');
select ok(
  not has_schema_privilege('anon', 'public', 'create') and not has_schema_privilege('authenticated', 'public', 'create'),
  'anon y authenticated no crean objetos en public'
);

select ok(has_function_privilege('authenticated', 'public.actualizar_whatsapp(text)', 'execute'), 'authenticated ejecuta actualizar_whatsapp');
select ok(not has_function_privilege('anon', 'public.actualizar_whatsapp(text)', 'execute'), 'anon no ejecuta actualizar_whatsapp');
select ok(has_function_privilege('authenticated', 'public.aceptar_normas(text)', 'execute'), 'authenticated ejecuta aceptar_normas');
select ok(not has_function_privilege('anon', 'public.aceptar_normas(text)', 'execute'), 'anon no ejecuta aceptar_normas');

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'p') and has_any_column_privilege('anon', c.oid, 'select')),
  array['barrios', 'perfiles_profesionales', 'resenas', 'usuarios_publicos'],
  'anon solo puede leer barrios, perfiles_profesionales, resenas y usuarios_publicos'
);

select is(
  (select count(*)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
     and (has_table_privilege('anon', c.oid, 'insert,update,delete,truncate,references,trigger')
          or has_any_column_privilege('anon', c.oid, 'insert,update,references'))),
  0::bigint,
  'anon no puede escribir en ninguna tabla ni vista de public'
);

select is(
  (select count(*)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
     and has_table_privilege('authenticated', c.oid, 'truncate,references,trigger')),
  0::bigint,
  'authenticated no tiene truncate, references ni trigger sobre ninguna tabla'
);

select is(
  (select count(*)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('authenticated', c.oid, 'insert,update')),
  0::bigint,
  'authenticated no tiene insert ni update a nivel de tabla: todo es por columna'
);

select ok(
  not has_column_privilege('authenticated', 'public.usuarios', c.col, 'update'),
  'authenticated no puede actualizar usuarios.' || c.col
)
from (values ('id'), ('rol'), ('whatsapp'), ('normas_version'), ('normas_aceptadas_at'), ('estado')) as c (col);

select ok(
  not has_column_privilege('authenticated', 'public.perfiles_profesionales', c.col, 'update')
  and not has_column_privilege('authenticated', 'public.perfiles_profesionales', c.col, 'insert'),
  'authenticated no escribe perfiles_profesionales.' || c.col
)
from (values ('publicado'), ('promedio'), ('cantidad_resenas'), ('prioridad')) as c (col);

select ok(
  not has_column_privilege(r.rol, 'public.perfiles_profesionales', 'matricula_numero', 'select'),
  r.rol || ' no puede leer perfiles_profesionales.matricula_numero'
)
from (values ('anon'), ('authenticated')) as r (rol);

select ok(
  not has_any_column_privilege('authenticated', 'public.contactos', 'insert,update')
  and not has_table_privilege('authenticated', 'public.contactos', 'insert'),
  'authenticated no inserta ni actualiza contactos por la API'
);
select ok(not has_table_privilege('authenticated', 'public.usuarios', 'delete'), 'nadie borra usuarios por la API');
select ok(not has_table_privilege('authenticated', 'public.perfiles_profesionales', 'delete'), 'nadie borra perfiles_profesionales por la API');

select ok(
  not has_column_privilege('authenticated', 'public.perfiles_profesionales', c.col, 'insert'),
  'authenticated no inserta perfiles_profesionales.' || c.col
)
from (values ('identidad_verificada'), ('antecedentes_ok'), ('matriculado')) as c (col);

select ok(not has_table_privilege('authenticated', 'public.verificaciones', 'delete'), 'nadie borra verificaciones por la API');
select ok(not has_table_privilege('authenticated', 'public.postulaciones', 'delete'), 'nadie borra postulaciones por la API');
select ok(not has_table_privilege('authenticated', 'public.contactos', 'delete'), 'nadie borra contactos por la API');
select ok(not has_table_privilege('authenticated', 'public.reportes', 'delete'), 'nadie borra reportes por la API');

-- ===========================================================================
-- Storage: buckets
-- ===========================================================================

select is((select public from storage.buckets where id = 'fotos'), true, 'storage: el bucket fotos es público');
select is((select public from storage.buckets where id = 'documentos'), false, 'storage: el bucket documentos es privado');
select is((select file_size_limit from storage.buckets where id = 'fotos'), 3145728::bigint, 'storage: fotos pesa como máximo 3 MB');
select is((select file_size_limit from storage.buckets where id = 'documentos'), 8388608::bigint, 'storage: documentos pesa como máximo 8 MB');
select is(
  (select array_agg(t order by t) from unnest((select allowed_mime_types from storage.buckets where id = 'fotos')) as t),
  array['image/jpeg', 'image/png', 'image/webp'],
  'storage: fotos acepta jpeg, png y webp'
);
select is(
  (select array_agg(t order by t) from unnest((select allowed_mime_types from storage.buckets where id = 'documentos')) as t),
  array['application/pdf', 'image/jpeg', 'image/png'],
  'storage: documentos acepta jpeg, png y pdf'
);

-- ===========================================================================
-- Storage: documentos (privado)
-- ===========================================================================

-- Un trigger de Storage (protect_delete) frena todo DELETE directo sobre storage.objects, aun
-- sin filas. Se habilita para esta transacción y así se prueba lo que decide RLS, no el trigger.
select set_config('storage.allow_delete_query', 'true', true);

-- Consentimiento vigente para datos sensibles (LAB-43): sin él no se sube a documentos.
update public.usuarios
set datos_sensibles_version = '2026-10', datos_sensibles_consentido_at = now()
where id = 'cccccccc-1200-4000-a000-000000000004';

select tests.como('cccccccc-1200-4000-a000-000000000004');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000004/antecedentes-1791734400002.pdf')$$,
  'documentos: el profesional sube a su carpeta con el nombre <tipo>-<timestamp>.<ext>'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000005/dni_frente-1791734400002.jpg')$$,
  '42501', null, 'documentos: no sube a la carpeta de otro'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000004/selfie-1791734400002.jpg')$$,
  '42501', null, 'documentos: el nombre tiene que empezar con un tipo de documento'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000004/dni_frente-1791734400002.exe')$$,
  '42501', null, 'documentos: la extensión tiene que ser jpg, jpeg, png o pdf'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'dni_frente-1791734400002.jpg')$$,
  '42501', null, 'documentos: no sube fuera de una carpeta propia'
);
select is((select count(*) from storage.objects where bucket_id = 'documentos'), 0::bigint, 'documentos: el dueño no lista ni descarga (ni su propio DNI)');
select is_empty($$update storage.objects set name = name where bucket_id = 'documentos' returning 1$$, 'documentos: el dueño no actualiza');
select is_empty($$delete from storage.objects where bucket_id = 'documentos' returning 1$$, 'documentos: el dueño no borra');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000002/dni_frente-1791734400003.jpg')$$,
  '42501', null, 'documentos: un cliente no sube documentos'
);
select is((select count(*) from storage.objects where bucket_id = 'documentos'), 0::bigint, 'documentos: un cliente no lee nada');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000007');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000007/dni_frente-1791734400003.jpg')$$,
  '42501', null, 'documentos: un profesional suspendido no sube'
);

reset role; select tests.anonimo();
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000004/dni_dorso-1791734400003.jpg')$$,
  '42501', null, 'documentos: anon no sube'
);
select is((select count(*) from storage.objects where bucket_id = 'documentos'), 0::bigint, 'documentos: anon no lee');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000001');
select is(
  (select count(*) from storage.objects where bucket_id = 'documentos' and name like 'cccccccc-1200-4000-a000-000000000004/%'),
  0::bigint,
  'documentos: el admin no lee el bucket con su JWT (lo firma el servidor)'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('documentos', 'cccccccc-1200-4000-a000-000000000001/dni_frente-1791734400003.jpg')$$,
  '42501', null, 'documentos: el admin no es profesional, no sube'
);

-- ===========================================================================
-- Storage: fotos (público)
-- ===========================================================================

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'perfiles/cccccccc-1200-4000-a000-000000000004/foto.jpg')$$,
  'fotos: el dueño sube a perfiles/<uid>/'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'trabajos-hechos/cccccccc-1200-4000-a000-000000000004/obra1.png')$$,
  'fotos: el dueño sube a trabajos-hechos/<uid>/'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'perfiles/cccccccc-1200-4000-a000-000000000005/foto.jpg')$$,
  '42501', null, 'fotos: no sube a la carpeta de otro'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'otros/cccccccc-1200-4000-a000-000000000004/foto.jpg')$$,
  '42501', null, 'fotos: no sube a una carpeta fuera de las permitidas'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'perfiles/cccccccc-1200-4000-a000-000000000004')$$,
  '42501', null, 'fotos: tiene que haber un archivo dentro de la carpeta'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'fotos'),
  2::bigint,
  'fotos: el dueño ve sus propios archivos'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000005');
select is((select count(*) from storage.objects where bucket_id = 'fotos'), 0::bigint, 'fotos: otro usuario no lista los archivos ajenos por la API');
select is_empty($$delete from storage.objects where bucket_id = 'fotos' returning 1$$, 'fotos: no borra archivos ajenos');

reset role; select tests.como('cccccccc-1200-4000-a000-000000000002');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'trabajos/cccccccc-1200-4000-b000-000000000001/foto.jpg')$$,
  'fotos: el cliente sube fotos de su trabajo'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'trabajos/cccccccc-1200-4000-b000-000000000003/foto.jpg')$$,
  '42501', null, 'fotos: no sube fotos a un trabajo ajeno'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'trabajos/no-es-un-uuid/foto.jpg')$$,
  '42501', null, 'fotos: una ruta de trabajo inválida se rechaza sin error de casteo'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000006');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'perfiles/cccccccc-1200-4000-a000-000000000006/foto.jpg')$$,
  '42501', null, 'fotos: un usuario suspendido no sube'
);

reset role; select tests.anonimo();
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fotos', 'perfiles/cccccccc-1200-4000-a000-000000000004/anon.jpg')$$,
  '42501', null, 'fotos: anon no sube'
);

reset role; select tests.como('cccccccc-1200-4000-a000-000000000004');
select results_eq(
  $$delete from storage.objects where bucket_id = 'fotos' and name = 'perfiles/cccccccc-1200-4000-a000-000000000004/foto.jpg' returning 1$$,
  $$values (1)$$,
  'fotos: el dueño borra sus archivos'
);

reset role;
select * from finish();

rollback;
