-- LAB-30 · Tests de RLS de preferencias_email, emails_pendientes y emails_enviados (pgTAP).
-- Correr con `pnpm db:test`. Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema tests_emails;

create function tests_emails.como(p_uid uuid) returns void language plpgsql as $$
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
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3000-4000-a000-000000000001', 'authenticated', 'authenticated', 'em-a@labia.test', '{"nombre": "Ana"}'),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-3000-4000-a000-000000000002', 'authenticated', 'authenticated', 'em-b@labia.test', '{"nombre": "Beto"}');

-- Sin fila de preferencias = todo activo; el dueño crea y cambia la suya.
select tests_emails.como('cccccccc-3000-4000-a000-000000000001');

select lives_ok(
  $$insert into public.preferencias_email (usuario_id, trabajos_cerca) values ('cccccccc-3000-4000-a000-000000000001', false)$$,
  'preferencias_email: el dueño crea la suya'
);
select results_eq(
  $$select trabajos_cerca, novedades from public.preferencias_email$$,
  $$values (false, true)$$,
  'preferencias_email: el dueño lee la suya y novedades queda activa por defecto'
);
select lives_ok(
  $$update public.preferencias_email set novedades = false where usuario_id = 'cccccccc-3000-4000-a000-000000000001'$$,
  'preferencias_email: el dueño la modifica'
);
select throws_ok(
  $$insert into public.preferencias_email (usuario_id) values ('cccccccc-3000-4000-a000-000000000002')$$,
  '42501', null, 'preferencias_email: no crea la de otro'
);
select throws_ok(
  $$update public.preferencias_email set usuario_id = 'cccccccc-3000-4000-a000-000000000002'$$,
  '42501', null, 'preferencias_email: no cambia el dueño de la fila'
);

-- Otro usuario no la ve ni la toca.
reset role; select tests_emails.como('cccccccc-3000-4000-a000-000000000002');
select is_empty(
  $$select 1 from public.preferencias_email$$,
  'preferencias_email: otro usuario no la ve'
);
select results_eq(
  $$update public.preferencias_email set novedades = true returning 1$$,
  $$select 1 where false$$,
  'preferencias_email: otro usuario no la modifica'
);

-- Anónimo: nada.
reset role; set local role anon;
select throws_ok(
  $$select 1 from public.preferencias_email$$,
  '42501', null, 'preferencias_email: anon no tiene acceso'
);

-- Las tablas internas son solo para la service role.
reset role; select tests_emails.como('cccccccc-3000-4000-a000-000000000001');
select throws_ok(
  $$select 1 from public.emails_pendientes$$,
  '42501', null, 'emails_pendientes: un usuario no la lee'
);
select throws_ok(
  $$insert into public.emails_enviados (clave) values ('x')$$,
  '42501', null, 'emails_enviados: un usuario no escribe'
);
select throws_ok(
  $$select 1 from public.emails_enviados$$,
  '42501', null, 'emails_enviados: un usuario no la lee'
);

reset role;
select * from finish();

rollback;
