-- LAB-54 · Lectura sin consumo del rate limit persistente.
--
-- `consumir_cupo` cuenta un intento y lo rechaza si pasa el máximo. El ingreso necesita algo distinto:
-- saber si la clave ya agotó su cupo SIN contar un intento, para no atender una contraseña cuando el
-- tope está cumplido. Esta función solo lee `privado.cupos_limite`; no incrementa ni crea filas.
--
-- Criterio, igual que `consumir_cupo`: el próximo intento entra si la ventana está vencida, si no
-- hay fila, o si el conteo actual es menor que el máximo. Coincide con lo que `consumir_cupo`
-- rechazaría: el intento que llevaría el conteo por encima del máximo es el que se bloquea.

create function public.consultar_cupo(
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

  -- Solo lectura: si no hay fila, `into` deja las variables en null y el intento entra.
  select c.cuenta, c.vence into v_cuenta, v_vence
  from privado.cupos_limite c
  where c.clave = p_clave;

  -- `return query` no corta la función: con else se devuelve una sola fila.
  if v_cuenta is null or v_vence <= v_ahora or v_cuenta < p_maximo then
    return query select true, 0;
  else
    return query select false, greatest(1, ceil(extract(epoch from (v_vence - v_ahora)))::integer);
  end if;
end;
$$;

-- Solo service role: la llama el servidor (src/lib/rate-limit-servicio.ts, server-only). Anon y
-- authenticated no la ejecutan, así que nadie puede sondear cupos ajenos desde el cliente.
revoke execute on function public.consultar_cupo(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consultar_cupo(text, integer, integer) to service_role;
