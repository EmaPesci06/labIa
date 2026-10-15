-- LAB-41 · Tests del rate limit persistente (public.consumir_cupo) y de privado.es_admin() con cuenta suspendida.
-- Correr con `pnpm db:test`. Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

create schema tests_cupos;

create function tests_cupos.como(p_uid uuid) returns void language plpgsql as $$
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
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-4100-4000-a000-000000000001', 'authenticated', 'authenticated', 'cupo-admin@labia.test', '{"nombre": "Admin"}');

-- El trigger solo acepta cliente o profesional; el admin se asigna como superusuario de la prueba.
update public.usuarios set rol = 'admin' where id = 'cccccccc-4100-4000-a000-000000000001';

-- Cupos: se cuentan los intentos y se rechaza el que pasa del máximo.
set local role anon;

select results_eq(
  $$select permitido from public.consumir_cupo('test:ip-1', 2, 60)$$,
  $$values (true)$$,
  'consumir_cupo: el primer intento entra'
);
select results_eq(
  $$select permitido from public.consumir_cupo('test:ip-1', 2, 60)$$,
  $$values (true)$$,
  'consumir_cupo: el segundo intento entra (el máximo es 2)'
);
select results_eq(
  $$select permitido, segundos_para_reintentar > 0 from public.consumir_cupo('test:ip-1', 2, 60)$$,
  $$values (false, true)$$,
  'consumir_cupo: el tercero se rechaza y avisa cuántos segundos faltan'
);

-- Otra clave tiene su propio cupo.
select results_eq(
  $$select permitido from public.consumir_cupo('test:ip-2', 2, 60)$$,
  $$values (true)$$,
  'consumir_cupo: otra clave arranca en cero'
);

-- Ventana vencida: el cupo se libera (se simula vencimiento como superusuario).
reset role;
update privado.cupos_limite set vence = now() - interval '1 second' where clave = 'test:ip-1';
set local role anon;
select results_eq(
  $$select permitido from public.consumir_cupo('test:ip-1', 2, 60)$$,
  $$values (true)$$,
  'consumir_cupo: con la ventana vencida vuelve a entrar'
);

-- Parámetros inválidos se rechazan.
select throws_ok(
  $$select * from public.consumir_cupo('', 2, 60)$$,
  '22023', null, 'consumir_cupo: clave vacía se rechaza'
);
select throws_ok(
  $$select * from public.consumir_cupo('test:x', 0, 60)$$,
  '22023', null, 'consumir_cupo: máximo 0 se rechaza'
);
select throws_ok(
  $$select * from public.consumir_cupo('test:x', 2, 0)$$,
  '22023', null, 'consumir_cupo: ventana 0 se rechaza'
);

-- La tabla no se puede leer ni escribir con la API.
select throws_ok(
  $$select count(*) from privado.cupos_limite$$,
  '42501', null, 'cupos_limite: anon no la lee'
);
select throws_ok(
  $$delete from privado.cupos_limite$$,
  '42501', null, 'cupos_limite: anon no la borra'
);

-- Admin activo: privado.es_admin() es verdadero. Suspendido: deja de serlo (LAB-41).
reset role;
select tests_cupos.como('cccccccc-4100-4000-a000-000000000001');
select ok(privado.es_admin(), 'es_admin: un admin activo es admin');

reset role;
update public.usuarios set estado = 'suspendida' where id = 'cccccccc-4100-4000-a000-000000000001';
select tests_cupos.como('cccccccc-4100-4000-a000-000000000001');
select ok(not privado.es_admin(), 'es_admin: un admin suspendido ya no es admin');

select * from finish();
rollback;
