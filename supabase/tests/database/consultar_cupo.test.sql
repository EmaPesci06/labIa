-- LAB-54 · Tests de public.consultar_cupo (lectura sin consumo del rate limit persistente).
-- Correr con `pnpm db:test`. Todo corre en una transacción y se deshace al final.
begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- Privilegios: solo service_role la ejecuta.
select ok(
  not has_function_privilege('anon', 'public.consultar_cupo(text, integer, integer)', 'EXECUTE'),
  'consultar_cupo: anon no la ejecuta'
);
select ok(
  not has_function_privilege('authenticated', 'public.consultar_cupo(text, integer, integer)', 'EXECUTE'),
  'consultar_cupo: authenticated no la ejecuta'
);
select ok(
  has_function_privilege('service_role', 'public.consultar_cupo(text, integer, integer)', 'EXECUTE'),
  'consultar_cupo: service_role la ejecuta'
);

set local role service_role;

-- Sin fila: el intento entra.
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-1', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: clave sin registro entra'
);

-- Consultar no cuenta: con la clave en cero, muchas consultas no mueven el conteo.
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-1', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: sigue entrando después de consultar'
);

-- Se consumen dos intentos (el máximo es 2).
select results_eq(
  $$select permitido from public.consumir_cupo('test:consulta-1', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: el primer consumo entra'
);
select results_eq(
  $$select permitido from public.consumir_cupo('test:consulta-1', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: el segundo consumo entra'
);

-- Cupo agotado: la consulta lo ve sin consumir, y repetirla no cambia nada.
select results_eq(
  $$select permitido, segundos_para_reintentar > 0 from public.consultar_cupo('test:consulta-1', 2, 60)$$,
  $$values (false, true)$$,
  'consultar_cupo: con el cupo agotado bloquea y avisa cuántos segundos faltan'
);
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-1', 2, 60)$$,
  $$values (false)$$,
  'consultar_cupo: consultar otra vez sigue bloqueando (no consume)'
);

reset role;
select results_eq(
  $$select cuenta from privado.cupos_limite where clave = 'test:consulta-1'$$,
  $$values (2)$$,
  'consultar_cupo: el conteo sigue en 2 después de las consultas'
);

set local role service_role;

-- El consumo rechaza el tercero, igual que antes: la consulta y el consumo coinciden.
select results_eq(
  $$select permitido from public.consumir_cupo('test:consulta-1', 2, 60)$$,
  $$values (false)$$,
  'consultar_cupo: el consumo rechaza el tercero, como anticipaba la consulta'
);

-- Otra clave tiene su propio cupo.
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-2', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: otra clave arranca en cero'
);

-- Ventana vencida: la consulta vuelve a dar cupo (se simula el vencimiento como superusuario).
reset role;
update privado.cupos_limite set vence = now() - interval '1 second' where clave = 'test:consulta-1';
set local role service_role;
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-1', 2, 60)$$,
  $$values (true)$$,
  'consultar_cupo: con la ventana vencida vuelve a entrar'
);

-- Un máximo mayor que el conteo deja pasar aunque la clave ya tenga intentos.
select results_eq(
  $$select permitido from public.consultar_cupo('test:consulta-2', 5, 60)$$,
  $$values (true)$$,
  'consultar_cupo: con máximo mayor al conteo entra'
);

-- Parámetros inválidos se rechazan.
select throws_ok(
  $$select * from public.consultar_cupo('', 2, 60)$$,
  '22023', null, 'consultar_cupo: clave vacía se rechaza'
);
select throws_ok(
  $$select * from public.consultar_cupo('test:x', 0, 60)$$,
  '22023', null, 'consultar_cupo: máximo 0 se rechaza'
);
select throws_ok(
  $$select * from public.consultar_cupo('test:x', 2, 0)$$,
  '22023', null, 'consultar_cupo: ventana 0 se rechaza'
);

-- La tabla sigue sin lectura directa para anon.
reset role;
set local role anon;
select throws_ok(
  $$select count(*) from privado.cupos_limite$$,
  '42501', null, 'consultar_cupo: la tabla sigue sin lectura para anon'
);

select * from finish();
rollback;
