-- LAB-53 · Campos libres sin teléfonos, emails ni direcciones (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final.
--
-- La tabla `casos` es la misma que lee src/lib/validaciones/contenido-publico.paridad.test.ts: cada
-- fila `('texto', bloquea)` tiene que dar lo mismo en el helper de la app y en privado.tiene_dato_de_contacto.
-- Si agregás un caso, agregalo acá (con el formato de fila de abajo) y el test de la app lo corre solo.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create temp table casos (texto text, bloquea boolean) on commit drop;

insert into casos (texto, bloquea) values
  ('llamame al 223 555-1234', true),
  ('mi cel es 2235551234', true),
  ('+54 9 223 555 1234', true),
  ('(0223) 495-1234', true),
  ('223.555.1234 después de las 18', true),
  ('２２３ ５５５ １２３４', true),
  ('escribime a laura@correo.com', true),
  ('laura arroba gmail punto com', true),
  ('laura punto com, escribime', true),
  ('laura(at)gmail.com', true),
  ('hablame por wa.me/5492235551234', true),
  ('buscame en instagram.com/plomero_mdp', true),
  ('Vivo en Av. Colón 1234, puerta negra', true),
  ('Trabajo en la calle 12 n 1234', true),
  ('Pasaje Mitre 500 timbre 3', true),
  ('Independencia 2100 PB', true),
  ('Mitre n° 1234, al fondo', true),
  ('Son 3 canillas y 12 metros de caño', false),
  ('Presupuesto previo: $ 150.000', false),
  ('Precio de referencia $15000 por visita', false),
  ('Presupuesto de $15.000.000 con materiales incluidos', false),
  ('Presupuesto de $ 15000000 sin materiales', false),
  ('Trabajo en 2x3 m de living', false),
  ('Tablero de 220 V y 32 A, 2 disyuntores', false),
  ('Cambio 4 canillas y 1 termotanque de 80 litros', false),
  ('Disponible de lunes a viernes de 8 a 18 hs', false),
  ('Trabajé entre 2020-2024 en obras de Chauvín', false),
  ('Fecha tentativa 12.03.2026 a la mañana', false),
  ('trabajo el 12 03 2026 por la mañana', false),
  ('Ya tengo 15 años de experiencia en gas', false),
  ('Presupuesto 2025 para el baño completo', false),
  ('Fiat Palio 1998 2000 cc, motor nafta', false),
  ('Caño de 1200 mm y 3 codos', false),
  ('Gasista matriculado 12345, con matrícula al día', false),
  ('Matrícula N° 12345 de gas natural', false),
  ('Calle 3 de Abril, a la vuelta de la plaza', false),
  ('Av. Independencia y calle 12, esquina con kiosco', false),
  ('Medidas: 1 2 3 4 5 6 7 8 cm', false),
  ('Trabajo sobre calle Independencia, zona céntrica', false),
  ('', false);

-- El helper SQL coincide con la app en todos los casos.
select is(
  (select count(*)::int from casos where privado.tiene_dato_de_contacto(texto) is distinct from bloquea),
  0,
  'privado.tiene_dato_de_contacto coincide con el helper de la app en todos los casos'
);

-- Un texto de más de 5000 caracteres se trata como dato de contacto, sin analizarlo.
select ok(privado.tiene_dato_de_contacto(repeat('a', 5001)), 'un texto que pasa el largo máximo se bloquea');

-- ---------------------------------------------------------------------------
-- Escritura directa por la API: la base frena lo que Zod no vio
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-5300-4000-a000-000000000001', 'authenticated', 'authenticated', 'contenido-c@labia.test', '{"nombre": "Cliente", "apellido": "Contenido"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-5300-4000-a000-000000000002', 'authenticated', 'authenticated', 'contenido-p@labia.test', '{"rol": "profesional", "nombre": "Pro", "apellido": "Contenido"}');

select throws_ok(
  $$update public.usuarios set nombre = 'Llamame al 2235551234' where id = 'dddddddd-5300-4000-a000-000000000001'$$,
  '23514',
  'un teléfono en el nombre de la cuenta se rechaza'
);

select throws_ok(
  $$update public.usuarios set apellido = 'escribime a ana@gmail.com' where id = 'dddddddd-5300-4000-a000-000000000001'$$,
  '23514',
  'un email en el apellido se rechaza'
);

select lives_ok(
  $$update public.usuarios set nombre = 'Lucía' where id = 'dddddddd-5300-4000-a000-000000000001'$$,
  'un nombre legítimo se guarda'
);

select throws_ok(
  $$insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
    select 'dddddddd-5300-4000-a000-000000000011', 'dddddddd-5300-4000-a000-000000000001', 'plomeria', 'Pérdida de agua', 'Vivo en Independencia 2100, llamame al 223 555 1234', b.id, 'sin_apuro', 'abierto'
    from public.barrios b where b.slug = 'centro'$$,
  '23514',
  'una descripción de trabajo con dirección y teléfono se rechaza'
);

insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado)
select 'dddddddd-5300-4000-a000-000000000012', 'dddddddd-5300-4000-a000-000000000001', 'plomeria', 'Canilla en la cocina', 'Pierde agua, son 2 metros de caño y 3 codos', b.id, 'sin_apuro', 'abierto'
from public.barrios b where b.slug = 'centro';

select lives_ok(
  $$update public.trabajos set descripcion = 'Pierde agua de la canilla, presupuesto de $ 15.000 sin apuro' where id = 'dddddddd-5300-4000-a000-000000000012'$$,
  'una descripción de trabajo con precio se guarda'
);

select throws_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
    values ('dddddddd-5300-4000-a000-000000000012', 'dddddddd-5300-4000-a000-000000000002', 'Escribime a pro@gmail.com', 'enviada')$$,
  '23514',
  'un mensaje de postulación con email se rechaza'
);

select lives_ok(
  $$insert into public.postulaciones (trabajo_id, profesional_id, mensaje, estado)
    values ('dddddddd-5300-4000-a000-000000000012', 'dddddddd-5300-4000-a000-000000000002', 'Puedo ir hoy a las 17 h, son 2x3 m de caño', 'enviada')$$,
  'un mensaje de postulación con medidas se guarda'
);

select finish();
rollback;
