-- LAB-41 · Rate limit persistente entre instancias (Vercel).
--
-- El limitador en memoria de cada instancia no alcanza en serverless: cada instancia cuenta por su
-- lado. Acá se guarda el conteo en Postgres y se incrementa de forma atómica con un único
-- `insert ... on conflict do update` (la fila queda bloqueada durante el upsert, así que dos
-- pedidos simultáneos no pueden leer el mismo conteo).
--
-- La tabla vive en `privado` y no tiene políticas RLS: ni anon ni authenticated la leen ni la
-- escriben directamente. Solo la función `public.consumir_cupo` (security definer) la toca.

create table privado.cupos_limite (
  clave text primary key,
  cuenta integer not null check (cuenta > 0),
  vence timestamptz not null
);

create index cupos_limite_vence_idx on privado.cupos_limite (vence);

alter table privado.cupos_limite enable row level security;
revoke all on privado.cupos_limite from public, anon, authenticated, service_role;

-- Cuenta un intento para `p_clave` dentro de una ventana de `p_ventana_segundos` que arranca en el
-- primer intento. Devuelve si el intento entra en el límite y, si no, cuántos segundos faltan para
-- que se libere la ventana. Como en `limitarIntentos`, los intentos rechazados también cuentan.
create function public.consumir_cupo(
  p_clave text,
  p_maximo integer,
  p_ventana_segundos integer
)
returns table (permitido boolean, segundos_para_reintentar integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ahora timestamptz := now();
  v_cuenta integer;
  v_vence timestamptz;
begin
  if p_clave is null or char_length(p_clave) < 1 or char_length(p_clave) > 200 then
    raise exception 'Clave de límite inválida' using errcode = 'invalid_parameter_value';
  end if;
  if p_maximo is null or p_maximo < 1 or p_maximo > 1000 then
    raise exception 'Máximo de intentos inválido' using errcode = 'invalid_parameter_value';
  end if;
  if p_ventana_segundos is null or p_ventana_segundos < 1 or p_ventana_segundos > 86400 then
    raise exception 'Ventana de límite inválida' using errcode = 'invalid_parameter_value';
  end if;

  -- Limpieza oportunista de ventanas vencidas, acotada para no alargar cada pedido.
  delete from privado.cupos_limite
  where clave in (
    select c.clave from privado.cupos_limite c where c.vence <= v_ahora limit 100
  );

  insert into privado.cupos_limite as c (clave, cuenta, vence)
  values (p_clave, 1, v_ahora + make_interval(secs => p_ventana_segundos))
  on conflict (clave) do update set
    cuenta = case when c.vence <= v_ahora then 1 else c.cuenta + 1 end,
    vence = case
      when c.vence <= v_ahora then v_ahora + make_interval(secs => p_ventana_segundos)
      else c.vence
    end
  returning c.cuenta, c.vence into v_cuenta, v_vence;

  -- `return query` no corta la función: con else se devuelve una sola fila.
  if v_cuenta > p_maximo then
    return query select false, greatest(1, ceil(extract(epoch from (v_vence - v_ahora)))::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

-- Anon (registro e ingreso antes de tener sesión) y authenticated la llaman; nadie más.
revoke execute on function public.consumir_cupo(text, integer, integer) from public;
grant execute on function public.consumir_cupo(text, integer, integer) to anon, authenticated;
