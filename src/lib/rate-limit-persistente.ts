import { ipDelPedido } from "@/lib/ip-del-pedido";
import { limitarIntentos, type ResultadoLimite } from "@/lib/rate-limit";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

/** Máximo de intentos dentro de una ventana de tiempo. */
export type ReglaLimite = { maximo: number; ventanaMs: number };

/**
 * Cuenta un intento en Postgres (función `public.consumir_cupo`, migración LAB-41), así que el
 * límite se comparte entre todas las instancias de Vercel. Si la base no responde o no hay
 * Supabase configurado, cae al limitador en memoria: un fallo de la base no deja la acción sin freno.
 */
export async function limitarPersistente(
  clave: string,
  regla: ReglaLimite,
): Promise<ResultadoLimite> {
  if (!supabaseConfigurado()) return limitarIntentos(clave, regla);

  try {
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.rpc("consumir_cupo", {
      p_clave: clave,
      p_maximo: regla.maximo,
      p_ventana_segundos: Math.ceil(regla.ventanaMs / 1000),
    });
    const fila = data?.[0];
    if (error || !fila) throw new Error("consumir_cupo no devolvió resultado");
    return {
      permitido: fila.permitido,
      segundosParaReintentar: fila.segundos_para_reintentar,
    };
  } catch {
    return limitarIntentos(clave, regla);
  }
}

/**
 * Límite por IP y tipo de acción (Guía §7.7). Es el único punto que usan las acciones de auth,
 * registro y cuenta: así la clave y la fuente de la IP son siempre las mismas.
 */
export async function limitarPorIp(accion: string, regla: ReglaLimite): Promise<ResultadoLimite> {
  return limitarPersistente(`${accion}:${await ipDelPedido()}`, regla);
}

/** Mensaje en castellano para un límite superado, o `null` si el intento entra. */
export function mensajeDeLimite(resultado: ResultadoLimite): string | null {
  if (resultado.permitido) return null;
  return `Hiciste demasiados intentos. Esperá ${resultado.segundosParaReintentar} segundos y probá de nuevo.`;
}
