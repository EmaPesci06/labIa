-- LAB-45 · Filtros de public.trabajos_para_mi: zona, radio de 6 km, p_oficio y paginación (pgTAP).
-- Complementa trabajos_para_mi.test.sql (LAB-27) sin tocarlo. Todo corre en una transacción y se
-- deshace al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres, saltea RLS)
-- ---------------------------------------------------------------------------

-- La semilla (supabase/seed.sql) trae trabajos de otras pruebas: los quitamos dentro de esta
-- transacción para que los conteos solo cuenten los datos de este archivo.
delete from public.postulaciones;
delete from public.trabajos;

-- Usuarios:
-- Cliente: C1
-- Profesional PF: plomero y gasista, publicado, zonas {17} (Centro), toda_la_ciudad = false

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '45000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'cliente-45@labia.test', '{"rol": "cliente", "nombre": "Carla", "apellido": "Gómez"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '45000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'profesional-45@labia.test', '{"rol": "profesional", "nombre": "Pedro", "apellido": "López"}'::jsonb);

-- Barrios de la semilla: 17 Centro (zona del profesional), 20 Chauvín (a ~1,2 km: dentro del radio
-- de 6 km aunque no sea zona), 3 Alfar (a ~10 km: fuera del radio).
update public.usuarios set barrio_id = 17 where id = '45000000-0000-4000-a000-000000000002';

insert into public.perfiles_profesionales (usuario_id, oficios, zonas, toda_la_ciudad, matriculado, identidad_verificada, antecedentes_ok, publicado)
values ('45000000-0000-4000-a000-000000000002', '{plomeria,gas}', '{17}', false, true, true, true, true);

-- Trabajos abiertos:
-- TZ: plomería en Centro (zona)              -> entra con y sin radio
-- TC: plomería en Chauvín (radio, no zona)   -> entra solo con radio de 6 km
-- TL: plomería en Alfar (fuera de radio)     -> entra solo sin filtro de zona
-- TG: gas en Centro (zona)                   -> filtrable por oficio
-- TA: asignado (cerrado)                     -> nunca aparece
insert into public.trabajos (id, cliente_id, oficio, titulo, descripcion, barrio_id, urgencia, estado, created_at)
values
  ('45000000-0000-4000-b000-000000000001', '45000000-0000-4000-a000-000000000001', 'plomeria', 'Zona Centro', 'En mi zona', 17, 'sin_apuro', 'abierto', now() - interval '1 hour'),
  ('45000000-0000-4000-b000-000000000002', '45000000-0000-4000-a000-000000000001', 'plomeria', 'Radio Chauvin', 'Cerca, no en zona', 20, 'sin_apuro', 'abierto', now() - interval '2 hours'),
  ('45000000-0000-4000-b000-000000000003', '45000000-0000-4000-a000-000000000001', 'plomeria', 'Lejos Alfar', 'Fuera del radio', 3, 'sin_apuro', 'abierto', now() - interval '3 hours'),
  ('45000000-0000-4000-b000-000000000004', '45000000-0000-4000-a000-000000000001', 'gas', 'Gas Centro', 'Gasista en zona', 17, 'sin_apuro', 'abierto', now() - interval '4 hours'),
  ('45000000-0000-4000-b000-000000000005', '45000000-0000-4000-a000-000000000001', 'plomeria', 'Asignado', 'Ya no está abierto', 17, 'sin_apuro', 'asignado', now() - interval '5 hours');

-- ---------------------------------------------------------------------------
-- 1. Zona y radio de 6 km (p_solo_mis_zonas = true, por defecto)
-- ---------------------------------------------------------------------------

reset role; select tests.como('45000000-0000-4000-a000-000000000002');

select is(
  (select count(*) from public.trabajos_para_mi()),
  3::bigint,
  'con "solo mis zonas" ve 3 trabajos: los de su zona y los de radio de 6 km'
);

select ok(
  (select count(*) = 1 from public.trabajos_para_mi() where id = '45000000-0000-4000-b000-000000000002'),
  'un trabajo a menos de 6 km fuera de sus zonas (Chauvín) sí aparece'
);

select is(
  (select count(*) from public.trabajos_para_mi() where id = '45000000-0000-4000-b000-000000000003'),
  0::bigint,
  'un trabajo a más de 6 km fuera de sus zonas (Alfar) no aparece'
);

select is(
  (select count(*) from public.trabajos_para_mi() where id = '45000000-0000-4000-b000-000000000005'),
  0::bigint,
  'un trabajo asignado (cerrado) no aparece aunque esté en su zona'
);

select is(
  (select count(*) from public.trabajos_para_mi(p_solo_mis_zonas => false)),
  4::bigint,
  'sin "solo mis zonas" ve los 4 trabajos abiertos de sus oficios, incluido el de Alfar'
);

select ok(
  (select count(*) = 1 from public.trabajos_para_mi(p_solo_mis_zonas => false) where id = '45000000-0000-4000-b000-000000000003'),
  'sin "solo mis zonas" el trabajo a más de 6 km sí aparece'
);

-- ---------------------------------------------------------------------------
-- 2. Filtro por oficio (p_oficio)
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.trabajos_para_mi(p_oficio => 'plomeria')),
  2::bigint,
  'p_oficio = plomeria devuelve solo sus trabajos de plomería en zona o radio'
);

select is(
  (select count(*) from public.trabajos_para_mi(p_oficio => 'gas')),
  1::bigint,
  'p_oficio = gas devuelve solo el trabajo de gas'
);

select is(
  (select count(*) from public.trabajos_para_mi(p_oficio => 'electricidad')),
  0::bigint,
  'p_oficio de un oficio que el profesional no tiene devuelve 0 filas'
);

-- ---------------------------------------------------------------------------
-- 3. Paginación (p_limite, p_desde) con total
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.trabajos_para_mi(p_solo_mis_zonas => false, p_limite => 2, p_desde => 0)),
  2::bigint,
  'p_limite = 2 devuelve 2 filas en la primera página'
);

select is(
  (select total from public.trabajos_para_mi(p_solo_mis_zonas => false, p_limite => 2, p_desde => 0) limit 1),
  4::bigint,
  'total indica los 4 trabajos aunque la página tenga 2'
);

select is(
  (select count(distinct id) from (
     select id from public.trabajos_para_mi(p_solo_mis_zonas => false, p_limite => 2, p_desde => 0)
     union all
     select id from public.trabajos_para_mi(p_solo_mis_zonas => false, p_limite => 2, p_desde => 2)
   ) paginas),
  4::bigint,
  'dos páginas de 2 cubren los 4 trabajos sin repetir ninguno'
);

select is(
  (select count(*) from public.trabajos_para_mi(p_solo_mis_zonas => false, p_limite => 2, p_desde => 4)),
  0::bigint,
  'una página más allá del final devuelve 0 filas'
);

rollback;
