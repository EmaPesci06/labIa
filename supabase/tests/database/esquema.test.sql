-- LAB-11 · Tests del esquema inicial (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- ---------------------------------------------------------------------------
-- Tablas y RLS
-- ---------------------------------------------------------------------------

select tables_are(
  'public',
  array[
    'barrios', 'usuarios', 'perfiles_profesionales', 'verificaciones', 'trabajos',
    'postulaciones', 'contactos', 'resenas', 'reportes',
    'preferencias_email', 'emails_pendientes', 'emails_enviados', 'acciones_moderacion'
  ],
  'public tiene exactamente las tablas del MVP (esquema, emails de LAB-30 y acciones_moderacion de LAB-33)'
);

select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'todas las tablas de public tienen RLS activado'
);

select cmp_ok(
  (select count(*) from pg_policies where schemaname = 'public'),
  '>=',
  9::bigint,
  'hay políticas (LAB-12); las pruebas por tabla están en politicas.test.sql'
);

-- ---------------------------------------------------------------------------
-- Barrios y distancia
-- ---------------------------------------------------------------------------

select cmp_ok(
  (select count(*) from public.barrios),
  '>=',
  29::bigint,
  'hay al menos los 29 barrios pedidos en LAB-11'
);

select is(
  (
    select count(*)
    from unnest(array[
      'centro', 'la-perla', 'plaza-mitre', 'san-juan', 'los-pinares', 'chauvin', 'stella-maris',
      'playa-grande', 'los-troncos', 'varese', 'divino-rostro', 'constitucion', 'parque-luro',
      'punta-mogotes', 'bosque-peralta-ramos', 'faro-norte', 'puerto', 'san-carlos',
      'estacion-norte', 'don-bosco', 'la-florida', 'el-martillo', 'libertad',
      'malvinas-argentinas', 'las-avenidas', 'camet', 'alfar', 'batan', 'sierra-de-los-padres'
    ]) as s (slug)
    where not exists (select 1 from public.barrios b where b.slug = s.slug)
  ),
  0::bigint,
  'están todos los barrios de la lista mínima de LAB-11'
);

select is(
  (
    select count(*)
    from public.barrios
    where extensions.st_y(centro::extensions.geometry) not between -38.30 and -37.75
       or extensions.st_x(centro::extensions.geometry) not between -57.90 and -57.45
  ),
  0::bigint,
  'todos los centros caen dentro del Partido de General Pueyrredon'
);

select ok(
  public.distancia_km(
    (select id from public.barrios where slug = 'la-perla'),
    (select id from public.barrios where slug = 'centro')
  ) between 0.5 and 3,
  'distancia_km(La Perla, Centro) está entre 0,5 y 3 km'
);

select is(
  public.distancia_km(
    (select id from public.barrios where slug = 'centro'),
    (select id from public.barrios where slug = 'centro')
  ),
  0.0::numeric,
  'distancia_km de un barrio consigo mismo es 0'
);

select is(
  public.distancia_km(1::smallint, 32000::smallint),
  null::numeric,
  'distancia_km con un barrio inexistente devuelve null'
);

-- ---------------------------------------------------------------------------
-- Alta de usuarios desde auth.users
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000001', 'authenticated',
   'authenticated', 'test-admin@labia.test', '{"rol": "admin", "nombre": "Intruso"}'),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000002', 'authenticated',
   'authenticated', 'test-pro@labia.test', '{"rol": "profesional", "nombre": "Ana", "apellido": "Paz"}'),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000003', 'authenticated',
   'authenticated', 'test-cliente@labia.test', null),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000004', 'authenticated',
   'authenticated', 'test-gas@labia.test', '{"rol": "profesional"}');

select is(
  (select rol from public.usuarios where id = 'aaaaaaaa-0000-4000-a000-000000000001'),
  'cliente'::public.rol,
  'rol admin en metadata crea un cliente, nunca un admin'
);

select is(
  (select rol from public.usuarios where id = 'aaaaaaaa-0000-4000-a000-000000000002'),
  'profesional'::public.rol,
  'rol profesional en metadata crea un profesional'
);

select is(
  (select rol from public.usuarios where id = 'aaaaaaaa-0000-4000-a000-000000000003'),
  'cliente'::public.rol,
  'sin metadata se crea un cliente'
);

select is(
  (select nombre || ' ' || apellido from public.usuarios where id = 'aaaaaaaa-0000-4000-a000-000000000002'),
  'Ana Paz',
  'nombre y apellido se copian de la metadata'
);

-- ---------------------------------------------------------------------------
-- Perfil profesional: validaciones y `publicado`
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad)
    values ('aaaaaaaa-0000-4000-a000-000000000003', '{plomeria}', true)$$,
  '23514',
  null,
  'un cliente no puede tener perfil profesional'
);

select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, zonas)
    values ('aaaaaaaa-0000-4000-a000-000000000002', '{plomeria}', '{}')$$,
  '23514',
  null,
  'sin zonas hay que marcar toda_la_ciudad'
);

select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, zonas)
    values ('aaaaaaaa-0000-4000-a000-000000000002', '{plomeria}', '{1,2,3,4,5,6,7,8,9,10,11}')$$,
  '23514',
  null,
  'no se aceptan más de 10 zonas'
);

select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, zonas)
    values ('aaaaaaaa-0000-4000-a000-000000000002', '{plomeria}', '{32000}')$$,
  '23503',
  null,
  'las zonas tienen que ser barrios existentes'
);

select throws_ok(
  $$insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad)
    values ('aaaaaaaa-0000-4000-a000-000000000002', '{}', true)$$,
  '23514',
  null,
  'hace falta al menos un oficio'
);

insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad, identidad_verificada, antecedentes_ok, publicado)
values
  ('aaaaaaaa-0000-4000-a000-000000000002', '{plomeria}', true, true, false, true),
  ('aaaaaaaa-0000-4000-a000-000000000004', '{gas,plomeria}', true, true, true, false);

select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000002'),
  false,
  'publicado no se puede forzar: sin antecedentes queda en false'
);

select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000004'),
  false,
  'un gasista sin matrícula no se publica'
);

update public.perfiles_profesionales set matriculado = true
where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000004';

select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000004'),
  true,
  'gasista con identidad, antecedentes y matrícula se publica'
);

update public.usuarios set estado = 'suspendida' where id = 'aaaaaaaa-0000-4000-a000-000000000004';

select is(
  (select publicado from public.perfiles_profesionales where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000004'),
  false,
  'suspender la cuenta despublica el perfil'
);

-- ---------------------------------------------------------------------------
-- Reseñas: promedio y cantidad
-- ---------------------------------------------------------------------------

insert into public.resenas (autor_id, profesional_id, puntaje, texto)
values
  ('aaaaaaaa-0000-4000-a000-000000000003', 'aaaaaaaa-0000-4000-a000-000000000002', 5, 'Impecable'),
  ('aaaaaaaa-0000-4000-a000-000000000001', 'aaaaaaaa-0000-4000-a000-000000000002', 4, null);

select results_eq(
  $$select promedio, cantidad_resenas from public.perfiles_profesionales
    where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000002'$$,
  $$values (4.5::numeric(2, 1), 2)$$,
  'insertar reseñas actualiza promedio y cantidad_resenas'
);

delete from public.resenas
where autor_id = 'aaaaaaaa-0000-4000-a000-000000000003'
  and profesional_id = 'aaaaaaaa-0000-4000-a000-000000000002';

select results_eq(
  $$select promedio, cantidad_resenas from public.perfiles_profesionales
    where usuario_id = 'aaaaaaaa-0000-4000-a000-000000000002'$$,
  $$values (4.0::numeric(2, 1), 1)$$,
  'borrar una reseña recalcula promedio y cantidad_resenas'
);

select throws_ok(
  $$insert into public.resenas (autor_id, profesional_id, puntaje)
    values ('aaaaaaaa-0000-4000-a000-000000000003', 'aaaaaaaa-0000-4000-a000-000000000004', 6)$$,
  '23514',
  null,
  'el puntaje va de 1 a 5'
);

select * from finish();

rollback;
