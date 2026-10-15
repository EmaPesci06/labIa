import { createHash } from "node:crypto";

import * as Sentry from "@sentry/nextjs";

import { ipDelPedido } from "@/lib/ip-del-pedido";
import { limitarIntentos, type ResultadoLimite } from "@/lib/rate-limit";
import { consumirCupoServicio } from "@/lib/rate-limit-servicio";
import { supabaseConfigurado } from "@/lib/supabase/servidor";

/** Máximo de intentos dentro de una ventana de tiempo. */
export type ReglaLimite = { maximo: number; ventanaMs: number };

/**
 * Cuenta un intento en Postgres (`public.consumir_cupo`, con la service role desde el servidor), así
 * que el límite se comparte entre todas las instancias de Vercel. La clave se guarda hasheada
 * (sha256) para que la tabla no tenga emails ni IPs en claro.
 *
 * Si la base no responde se cae al limitador en memoria (así la acción sigue frenada) y el error
 * se reporta a Sentry sin la clave ni datos personales. Sin Supabase configurado va directo a memoria.
 */
export async function limitarPersistente(
  clave: string,
  regla: ReglaLimite,
): Promise<ResultadoLimite> {
  if (!supabaseConfigurado()) return limitarIntentos(clave, regla);

  const claveHasheada = createHash("sha256").update(clave).digest("hex");
  try {
    const cupo = await consumirCupoServicio(
      claveHasheada,
      regla.maximo,
      Math.ceil(regla.ventanaMs / 1000),
    );
    return { permitido: cupo.permitido, segundosParaReintentar: cupo.segundosParaReintentar };
  } catch {
    // Sin la clave ni el email: solo el hecho de la falla.
    Sentry.captureException(
      new Error("consumir_cupo falló; el límite usa la memoria de la instancia"),
    );
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
