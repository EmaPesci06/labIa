-- LAB-81 · Tests de los términos y la mayoría de edad del cliente (pgTAP). Correr con `pnpm db:test`.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema tests_ter;

create function tests_ter.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
end;
$$;

-- 1 y 2: clientes de Google (sin metadata) · 3: alta con email y casilla · 4: alta con email sin la
-- versión · 5: Google con la metadata cargada a mano · 6: profesional · 7: email con versión vieja
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000001', 'authenticated', 'authenticated', 'ter-1@labia.test', '{"provider": "google"}', '{"nombre": "Gaby"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000002', 'authenticated', 'authenticated', 'ter-2@labia.test', '{"provider": "google"}', '{"nombre": "Gonzalo"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000003', 'authenticated', 'authenticated', 'ter-3@labia.test', '{"provider": "email"}', '{"rol": "cliente", "nombre": "Emi", "terminos_version": "2026-10"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000004', 'authenticated', 'authenticated', 'ter-4@labia.test', '{"provider": "email"}', '{"rol": "cliente", "nombre": "Eva"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000005', 'authenticated', 'authenticated', 'ter-5@labia.test', '{"provider": "google"}', '{"rol": "cliente", "nombre": "Gus", "terminos_version": "2026-10"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000006', 'authenticated', 'authenticated', 'ter-6@labia.test', '{"provider": "email"}', '{"rol": "profesional", "nombre": "Pablo", "terminos_version": "2026-10"}'),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-8100-4000-a000-000000000007', 'authenticated', 'authenticated', 'ter-7@labia.test', '{"provider": "email"}', '{"rol": "cliente", "nombre": "Vera", "terminos_version": "2020-01"}');

-- El alta: solo el email con la versión vigente queda aceptado.
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000001'), null, 'alta: una cuenta de Google arranca sin aceptar');
select is((select terminos_version from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000003'), '2026-10', 'alta: con email y la versión vigente queda registrada');
select ok((select terminos_aceptados_at is not null from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000003'), 'alta: con email y la versión vigente queda la fecha');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000004'), null, 'alta: con email sin la versión no queda aceptado');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000005'), null, 'alta: Google con la metadata cargada a mano no queda aceptado');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000006'), null, 'alta: un profesional no registra términos de cliente');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000007'), null, 'alta: con email y una versión vieja no queda aceptado');

-- Lo que NO se puede: escribirlo directo, ni la versión ni la fecha, ni siendo el dueño.
select tests_ter.como('dddddddd-8100-4000-a000-000000000001');
select throws_ok($$update public.usuarios set terminos_aceptados_at = now() where id = 'dddddddd-8100-4000-a000-000000000001'$$, '42501', null, 'directo: el dueño no escribe la fecha');
select throws_ok($$update public.usuarios set terminos_version = '2026-10' where id = 'dddddddd-8100-4000-a000-000000000001'$$, '42501', null, 'directo: el dueño no escribe la versión');
select throws_ok($$select public.aceptar_terminos('2020-01')$$, '23514', null, 'función: rechaza una versión que no es la vigente');
select throws_ok($$select public.aceptar_terminos('')$$, '23514', null, 'función: rechaza una versión vacía');
select throws_ok($$select public.aceptar_terminos(null)$$, '23514', null, 'función: rechaza una versión nula');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000001'), null, 'función: los rechazos no dejaron nada escrito');

-- Otra cuenta no puede aceptar por mí: la función solo toca la fila de quien llama.
reset role;
select tests_ter.como('dddddddd-8100-4000-a000-000000000002');
select lives_ok($$select public.aceptar_terminos('2026-10')$$, 'función: un cliente acepta con la versión vigente');
select is((select terminos_version from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000002'), '2026-10', 'función: quedó la versión');
select ok((select terminos_aceptados_at is not null from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000002'), 'función: quedó la fecha');
reset role;
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000001'), null, 'función: la cuenta de otro quedó sin aceptar');

-- Repetirlo no pisa la fecha original.
update public.usuarios set terminos_aceptados_at = '2026-01-01 10:00:00+00' where id = 'dddddddd-8100-4000-a000-000000000002';
select tests_ter.como('dddddddd-8100-4000-a000-000000000002');
select lives_ok($$select public.aceptar_terminos('2026-10')$$, 'función: aceptar de nuevo no falla');
select is((select terminos_aceptados_at from public.usuarios where id = 'dddddddd-8100-4000-a000-000000000002'), '2026-01-01 10:00:00+00'::timestamptz, 'función: con la misma versión se conserva la fecha');

-- Un profesional no la usa.
reset role;
select tests_ter.como('dddddddd-8100-4000-a000-000000000006');
select throws_ok($$select public.aceptar_terminos('2026-10')$$, '42501', null, 'función: un profesional no puede aceptar términos de cliente');

-- Sin sesión.
reset role;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok($$select public.aceptar_terminos('2026-10')$$, '42501', null, 'función: anon no puede ejecutarla');

select * from finish();
rollback;
