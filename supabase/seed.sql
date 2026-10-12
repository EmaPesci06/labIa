-- LAB-11 · Datos de prueba. SOLO local y CI: nunca en un proyecto remoto (labia-dev, preview ni producción).
-- Los barrios NO están acá: vienen en la migración 20261011190100_barrios_mar_del_plata.sql.
-- Contraseña de todas las cuentas: ver supabase/README.md.
-- Los documentos de verificación apuntan a rutas ficticias (no hay archivos en Storage).

-- ---------------------------------------------------------------------------
-- Cuentas (auth.users). El trigger al_crear_usuario crea la fila en public.usuarios.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  c.id::uuid,
  'authenticated',
  'authenticated',
  c.email,
  extensions.crypt('labia-prueba-1234', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('rol', c.rol, 'nombre', c.nombre, 'apellido', c.apellido),
  now(),
  now(),
  '', '', '', ''
from (
  values
    ('00000000-0000-4000-a000-000000000001', 'admin@labia.test', 'cliente', 'Equipo', 'LabÍA'),
    ('00000000-0000-4000-a000-000000000011', 'cliente1@labia.test', 'cliente', 'Lucía', 'Fernández'),
    ('00000000-0000-4000-a000-000000000012', 'cliente2@labia.test', 'cliente', 'Martín', 'Gómez'),
    ('00000000-0000-4000-a000-000000000021', 'carpinteria@labia.test', 'profesional', 'Jorge', 'Ríos'),
    ('00000000-0000-4000-a000-000000000022', 'plomeria@labia.test', 'profesional', 'Carlos', 'Pereyra'),
    ('00000000-0000-4000-a000-000000000023', 'cerrajeria@labia.test', 'profesional', 'Silvia', 'Acosta'),
    ('00000000-0000-4000-a000-000000000024', 'gas@labia.test', 'profesional', 'Raúl', 'Medina'),
    ('00000000-0000-4000-a000-000000000025', 'pintura@labia.test', 'profesional', 'Paula', 'Suárez'),
    ('00000000-0000-4000-a000-000000000026', 'mecanica@labia.test', 'profesional', 'Diego', 'Luna'),
    ('00000000-0000-4000-a000-000000000027', 'electricidad@labia.test', 'profesional', 'Andrea', 'Benítez'),
    ('00000000-0000-4000-a000-000000000028', 'multioficio@labia.test', 'profesional', 'Hernán', 'Castro'),
    ('00000000-0000-4000-a000-000000000029', 'pendiente@labia.test', 'profesional', 'Nicolás', 'Vera')
) as c (id, email, rol, nombre, apellido);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like '%@labia.test';

-- El admin se crea como cliente (el trigger nunca acepta admin) y se promueve acá.
update public.usuarios set rol = 'admin' where id = '00000000-0000-4000-a000-000000000001';

-- WhatsApp y barrio de cada cuenta.
update public.usuarios u
set whatsapp = d.whatsapp,
    barrio_id = (select b.id from public.barrios b where b.slug = d.barrio),
    normas_version = case when u.rol = 'profesional' then '2026-10' end,
    normas_aceptadas_at = case when u.rol = 'profesional' then now() end
from (
  values
    ('00000000-0000-4000-a000-000000000011', '+5492235550011', 'la-perla'),
    ('00000000-0000-4000-a000-000000000012', '+5492235550012', 'punta-mogotes'),
    ('00000000-0000-4000-a000-000000000021', '+5492235550021', 'centro'),
    ('00000000-0000-4000-a000-000000000022', '+5492235550022', 'san-juan'),
    ('00000000-0000-4000-a000-000000000023', '+5492235550023', 'los-troncos'),
    ('00000000-0000-4000-a000-000000000024', '+5492235550024', 'don-bosco'),
    ('00000000-0000-4000-a000-000000000025', '+5492235550025', 'playa-grande'),
    ('00000000-0000-4000-a000-000000000026', '+5492235550026', 'puerto'),
    ('00000000-0000-4000-a000-000000000027', '+5492235550027', 'constitucion'),
    ('00000000-0000-4000-a000-000000000028', '+5492235550028', 'parque-luro'),
    ('00000000-0000-4000-a000-000000000029', '+5492235550029', 'batan')
) as d (id, whatsapp, barrio)
where u.id = d.id::uuid;

-- ---------------------------------------------------------------------------
-- Perfiles profesionales: 8 verificados (uno gasista matriculado) y 1 pendiente.
-- `publicado` lo calcula el trigger a partir de las insignias.
-- ---------------------------------------------------------------------------

insert into public.perfiles_profesionales (
  usuario_id, oficios, especialidades, descripcion, anios_experiencia, toda_la_ciudad, zonas,
  disponibilidad, matricula_numero, identidad_verificada, antecedentes_ok, matriculado
)
select
  p.usuario_id::uuid,
  p.oficios::public.oficio[],
  p.especialidades,
  p.descripcion,
  p.anios,
  p.toda_la_ciudad,
  coalesce(
    (select array_agg(b.id order by b.id) from public.barrios b where b.slug = any (p.zonas)),
    '{}'
  ),
  p.disponibilidad,
  p.matricula,
  p.verificado,
  p.verificado,
  p.matricula is not null and p.verificado
from (
  values
    ('00000000-0000-4000-a000-000000000021', '{carpinteria}', 'Muebles a medida y placares',
     'Hago muebles a medida, placares y arreglos de carpintería en general.', 15, false,
     array['centro', 'la-perla', 'plaza-mitre', 'san-juan'], 'Lun a vie, 8 a 17 h', null, true),
    ('00000000-0000-4000-a000-000000000022', '{plomeria}', 'Pérdidas, termotanques y destapaciones',
     'Plomero matriculado en reparaciones domiciliarias. Presupuesto sin cargo.', 10, true,
     array[]::text[], 'Lun a sáb, 8 a 20 h', null, true),
    ('00000000-0000-4000-a000-000000000023', '{cerrajeria}', 'Aperturas y cambio de combinación',
     'Cerrajería del automotor y del hogar. Urgencias en la zona sur.', 8, false,
     array['los-troncos', 'playa-grande', 'varese', 'stella-maris', 'chauvin'], 'Todos los días, 9 a 21 h', null, true),
    ('00000000-0000-4000-a000-000000000024', '{gas}', 'Instalaciones y pruebas de hermeticidad',
     'Gasista matriculado. Habilitaciones, calefactores y cocinas.', 20, true,
     array[]::text[], 'Lun a vie, 8 a 18 h', 'MP-4521', true),
    ('00000000-0000-4000-a000-000000000025', '{pintura}', 'Interiores, frentes y membranas',
     'Pintura de interiores y exteriores, impermeabilización de techos.', 12, false,
     array['playa-grande', 'los-troncos', 'divino-rostro', 'san-carlos', 'puerto'], 'Lun a sáb, 8 a 18 h', null, true),
    ('00000000-0000-4000-a000-000000000026', '{mecanica}', 'Mecánica ligera a domicilio',
     'Service, frenos y diagnóstico a domicilio.', 6, false,
     array['puerto', 'punta-mogotes', 'faro-norte', 'san-carlos'], 'Lun a vie, 9 a 18 h', null, true),
    ('00000000-0000-4000-a000-000000000027', '{electricidad}', 'Tableros, cableado y disyuntores',
     'Electricista con experiencia en instalaciones domiciliarias y comerciales.', 9, false,
     array['constitucion', 'parque-luro', 'la-perla', 'zacagnini', 'los-pinares'], 'Lun a sáb, 8 a 19 h', null, true),
    ('00000000-0000-4000-a000-000000000028', '{plomeria,electricidad}', 'Arreglos generales del hogar',
     'Plomería y electricidad: los arreglos de siempre, rápido y prolijo.', 5, false,
     array['parque-luro', 'don-bosco', 'estacion-norte', 'san-juan', 'centro'], 'Lun a vie, 14 a 20 h', null, true),
    ('00000000-0000-4000-a000-000000000029', '{gas}', 'Calefactores',
     'Gasista en trámite de verificación.', 3, false,
     array['batan', 'el-colmenar'], 'Fines de semana', null, false)
) as p (usuario_id, oficios, especialidades, descripcion, anios, toda_la_ciudad, zonas, disponibilidad, matricula, verificado);

-- Documentos: aprobados para los verificados, pendientes para el último.
insert into public.verificaciones (usuario_id, tipo, storage_path, estado, revisado_por, revisado_at)
select
  p.usuario_id,
  t.tipo,
  p.usuario_id::text || '/' || t.tipo::text || '-1791734400000.jpg',
  case when p.identidad_verificada then 'aprobado' else 'pendiente' end::public.estado_verificacion,
  case when p.identidad_verificada then '00000000-0000-4000-a000-000000000001'::uuid end,
  case when p.identidad_verificada then now() end
from public.perfiles_profesionales p
cross join unnest(enum_range(null::public.tipo_documento)) as t (tipo)
where t.tipo <> 'matricula' or p.matricula_numero is not null;

-- ---------------------------------------------------------------------------
-- Trabajos (5 abiertos), postulaciones (3), contactos y reseñas (4).
-- ---------------------------------------------------------------------------

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, presupuesto_estimado, created_at)
select
  t.id::uuid,
  t.cliente_id::uuid,
  t.oficio::public.oficio,
  t.titulo,
  t.descripcion,
  (select b.id from public.barrios b where b.slug = t.barrio),
  t.urgencia::public.urgencia,
  t.presupuesto,
  now() - t.hace
from (
  values
    ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000011', 'plomeria',
     'Pierde la canilla de la cocina', 'Gotea todo el día aunque esté cerrada. Es una monocomando.',
     'la-perla', 'esta_semana', 25000, interval '20 minutes'),
    ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000011', 'gas',
     'Revisar calefactor que no prende', 'El piloto se apaga a los pocos segundos.',
     'la-perla', 'lo_antes_posible', null, interval '2 hours'),
    ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000012', 'pintura',
     'Pintar living y comedor', 'Unos 40 m² de paredes, color blanco. Hay que reparar un par de grietas.',
     'punta-mogotes', 'sin_apuro', 180000, interval '1 day'),
    ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000012', 'electricidad',
     'Salta la térmica al usar el horno', 'Cada vez que prendo el horno eléctrico se corta la luz de toda la casa.',
     'punta-mogotes', 'esta_semana', 40000, interval '3 days'),
    ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000011', 'carpinteria',
     'Arreglar puerta de placard', 'Se salió una bisagra y la puerta quedó torcida.',
     'la-perla', 'sin_apuro', null, interval '5 days')
) as t (id, cliente_id, oficio, titulo, descripcion, barrio, urgencia, presupuesto, hace);

insert into public.postulaciones (trabajo_id, profesional_id, mensaje, precio_estimado, sena_propuesta)
values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000022',
   'Hola Lucía, puedo pasar mañana a la tarde. Llevo el repuesto del cartucho.', 22000, 5000),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000028',
   'Te lo resuelvo hoy mismo si querés.', 25000, null),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000027',
   'Seguramente sea el disyuntor o la sección del cable. Lo reviso y te paso precio final.', 35000, 10000);

insert into public.contactos (cliente_id, profesional_id, origen, trabajo_id)
values
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000021', 'perfil', null),
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000022', 'postulacion', '00000000-0000-4000-b000-000000000001'),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000021', 'perfil', null),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000024', 'perfil', null);

insert into public.resenas (autor_id, profesional_id, trabajo_id, puntaje, texto)
values
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000021', null, 5,
   'Excelente trabajo con el placard, muy prolijo y puntual.'),
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-b000-000000000001', 4,
   'Resolvió rápido la pérdida. Llegó un poco tarde.'),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000021', null, 4,
   'Buen carpintero, cumplió con el presupuesto.'),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000024', null, 5,
   'Me dejó el calefactor andando y explicó todo. Muy recomendable.');
