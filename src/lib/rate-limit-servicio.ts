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
  const fila = data?.[0];
  if (error || !fila) throw new Error("consumir_cupo no devolvió resultado");
  return {
    permitido: fila.permitido,
    segundosParaReintentar: fila.segundos_para_reintentar,
  };
}
