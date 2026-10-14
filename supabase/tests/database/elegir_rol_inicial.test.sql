-- LAB-40 · Tests de public.elegir_rol_inicial (pgTAP). Correr con `pnpm db:test`.
-- Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create schema tests;

create function tests.como(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create function tests.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  set local role anon;
end;
$$;

-- a: cuenta nueva (cliente) · b: con whatsapp · c: con perfil profesional · d: admin · e: suspendida
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', ('cccccccc-4000-4000-a000-00000000000' || d.n)::uuid,
  'authenticated', 'authenticated', 'rol-' || d.n || '@labia.test', '{}'::jsonb
from (values (1), (2), (3), (4), (5)) as d (n);

update public.usuarios set whatsapp = '+5492235550000' where id = 'cccccccc-4000-4000-a000-000000000002';
update public.usuarios set rol = 'profesional' where id = 'cccccccc-4000-4000-a000-000000000003';
insert into public.perfiles_profesionales (usuario_id, oficios, toda_la_ciudad)
values ('cccccccc-4000-4000-a000-000000000003', '{plomeria}', true);
update public.usuarios set rol = 'admin' where id = 'cccccccc-4000-4000-a000-000000000004';
update public.usuarios set estado = 'suspendida' where id = 'cccccccc-4000-4000-a000-000000000005';

-- anon no puede ejecutarla
select tests.anonimo();
select throws_ok($$select public.elegir_rol_inicial('profesional')$$, '42501', null, 'anon no puede ejecutarla');
reset role;

-- cuenta nueva: cliente -> profesional
select tests.como('cccccccc-4000-4000-a000-000000000001');
select lives_ok($$select public.elegir_rol_inicial('profesional')$$, 'cuenta nueva elige profesional');
select is((select rol::text from public.usuarios where id = 'cccccccc-4000-4000-a000-000000000001'), 'profesional', 'el rol quedó profesional');
select lives_ok($$select public.elegir_rol_inicial('profesional')$$, 'repetir el mismo rol es idempotente');
select throws_ok($$select public.elegir_rol_inicial('admin')$$, '23514', null, 'nunca admin');
select throws_ok($$select public.elegir_rol_inicial(null)$$, '23514', null, 'rol nulo rechazado');
select lives_ok($$select public.elegir_rol_inicial('cliente')$$, 'sin datos todavía puede volver a cliente');
reset role;

-- con datos completos
select tests.como('cccccccc-4000-4000-a000-000000000002');
select throws_ok($$select public.elegir_rol_inicial('profesional')$$, '42501', null, 'con whatsapp no cambia de rol');
reset role;

select tests.como('cccccccc-4000-4000-a000-000000000003');
select throws_ok($$select public.elegir_rol_inicial('cliente')$$, '42501', null, 'con perfil profesional no cambia de rol');
reset role;

-- admin y suspendida
select tests.como('cccccccc-4000-4000-a000-000000000004');
select throws_ok($$select public.elegir_rol_inicial('cliente')$$, '42501', null, 'un admin no se degrada');
reset role;

select tests.como('cccccccc-4000-4000-a000-000000000005');
select throws_ok($$select public.elegir_rol_inicial('profesional')$$, '42501', null, 'cuenta suspendida no cambia de rol');
reset role;

-- sin sesión (authenticated sin fila)
select tests.como('cccccccc-4000-4000-a000-0000000000ff');
select throws_ok($$select public.elegir_rol_inicial('profesional')$$, '42501', null, 'sin fila en usuarios no hace nada');
reset role;

-- el UPDATE directo sigue bloqueado
select tests.como('cccccccc-4000-4000-a000-000000000001');
select throws_ok($$update public.usuarios set rol = 'admin' where id = 'cccccccc-4000-4000-a000-000000000001'$$, '42501', null, 'UPDATE directo del rol sigue bloqueado');
reset role;

select * from finish();
rollback;
