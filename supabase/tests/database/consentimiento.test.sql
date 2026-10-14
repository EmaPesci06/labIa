-- LAB-35 · Tests del consentimiento expreso de datos sensibles (pgTAP). Correr con `pnpm db:test`.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema tests_cons;

create function tests_cons.como(p_uid uuid) returns void language plpgsql as $$
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
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3500-4000-a000-000000000001', 'authenticated', 'authenticated', 'cons-p@labia.test', '{"rol": "profesional", "nombre": "Pablo", "apellido": "Gómez"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3500-4000-a000-000000000002', 'authenticated', 'authenticated', 'cons-c@labia.test', '{"rol": "cliente", "nombre": "Clara", "apellido": "Pérez"}');

select tests_cons.como('cccccccc-3500-4000-a000-000000000001');

select is(
  (select datos_sensibles_consentido_at from public.usuarios where id = 'cccccccc-3500-4000-a000-000000000001'),
  null,
  'consentimiento: arranca sin consentir'
);
select throws_ok($$update public.usuarios set datos_sensibles_version = '2026-10' where id = 'cccccccc-3500-4000-a000-000000000001'$$, '42501', null, 'consentimiento: el dueño no escribe la versión directo');
select throws_ok($$update public.usuarios set datos_sensibles_consentido_at = now() where id = 'cccccccc-3500-4000-a000-000000000001'$$, '42501', null, 'consentimiento: el dueño no escribe la fecha directo');
select lives_ok($$select public.aceptar_consentimiento_datos_sensibles('2026-10')$$, 'consentimiento: un profesional lo da por la función');
select is((select datos_sensibles_version from public.usuarios where id = 'cccccccc-3500-4000-a000-000000000001'), '2026-10', 'consentimiento: quedó la versión');
select ok((select datos_sensibles_consentido_at is not null from public.usuarios where id = 'cccccccc-3500-4000-a000-000000000001'), 'consentimiento: quedó la fecha');
select throws_ok($$select public.aceptar_consentimiento_datos_sensibles('')$$, '23514', null, 'consentimiento: rechaza una versión vacía');

reset role; select tests_cons.como('cccccccc-3500-4000-a000-000000000002');
select throws_ok($$select public.aceptar_consentimiento_datos_sensibles('2026-10')$$, '42501', null, 'consentimiento: un cliente no lo da');

reset role;
set local role anon;
select throws_ok($$select public.aceptar_consentimiento_datos_sensibles('2026-10')$$, '42501', null, 'consentimiento: anon no ejecuta la función');

select * from finish();
rollback;
