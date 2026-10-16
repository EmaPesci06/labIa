import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";

export type CupoServicio = { permitido: boolean; segundosParaReintentar: number };

/**
 * Llama a `public.consumir_cupo` con la service role (LAB-41). Solo servidor: la función no es
 * ejecutable por anon ni authenticated. Recibe claves ya armadas y hasheadas en el servidor
 * (`rate-limit-persistente.ts`), nunca un valor del cliente tal cual. Lanza si la base falla.
 */
export async function consumirCupoServicio(
  clave: string,
  maximo: number,
  ventanaSegundos: number,
): Promise<CupoServicio> {
  const { data, error } = await crearClienteAdmin().rpc("consumir_cupo", {
    p_clave: clave,
    p_maximo: maximo,
    p_ventana_segundos: ventanaSegundos,
  });
  return leerCupo(data, error);
}

/**
 * Llama a `public.consultar_cupo` con la service role (LAB-54): lee el cupo sin consumirlo. Solo lo
 * llama `rate-limit-consulta.ts` con claves ya hasheadas. Lanza si la base falla.
 */
export async function consultarCupoServicio(
  clave: string,
  maximo: number,
  ventanaSegundos: number,
): Promise<CupoServicio> {
  const { data, error } = await crearClienteAdmin().rpc("consultar_cupo", {
    p_clave: clave,
    p_maximo: maximo,
    p_ventana_segundos: ventanaSegundos,
  });
  return leerCupo(data, error);
}

function leerCupo(
  data: { permitido: boolean; segundos_para_reintentar: number }[] | null,
  error: unknown,
): CupoServicio {
  const fila = data?.[0];
  if (error || !fila) throw new Error("El cupo no devolvió resultado");
  return {
    permitido: fila.permitido,
    segundosParaReintentar: fila.segundos_para_reintentar,
  };
}
