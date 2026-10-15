import { createHash, createHmac } from "node:crypto";

import * as Sentry from "@sentry/nextjs";

import { ipDelPedido } from "@/lib/ip-del-pedido";
import { limitarIntentos, type ResultadoLimite } from "@/lib/rate-limit";
import { consumirCupoServicio } from "@/lib/rate-limit-servicio";
import { supabaseConfigurado } from "@/lib/supabase/servidor";

/** Máximo de intentos dentro de una ventana de tiempo. */
export type ReglaLimite = { maximo: number; ventanaMs: number };

/**
 * Clave que va a la tabla: HMAC-SHA256 con el secreto del servidor. Sin secreto, en dev, test, e2e
 * o preview se usa sha256 (comportamiento de siempre). En producción falla cerrado: lanza, para que
 * nunca se guarde una clave sin llave que se pueda revertir por fuerza bruta (LAB-49).
 */
export function claveDeLimite(clave: string): string {
  const secreto = process.env.RATE_LIMIT_SECRET;
  if (secreto) return createHmac("sha256", secreto).update(clave).digest("hex");
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "RATE_LIMIT_SECRET es obligatorio en producción: no se guardan claves sin llave.",
    );
  }
  return createHash("sha256").update(clave).digest("hex");
}

/**
 * Cuenta un intento en Postgres (`public.consumir_cupo`, con la service role desde el servidor), así
 * que el límite se comparte entre todas las instancias de Vercel. La clave se guarda con HMAC-SHA256
 * (secreto `RATE_LIMIT_SECRET`) para que la tabla no tenga emails ni IPs en claro y no se puedan
 * recalcular desde fuera. Si falta el secreto fuera de producción, cae a sha256; en producción lanza.
 *
 * Si la base no responde se cae al limitador en memoria (así la acción sigue frenada) y el error
 * se reporta a Sentry sin la clave ni datos personales. Sin Supabase configurado va directo a memoria.
 */
export async function limitarPersistente(
  clave: string,
  regla: ReglaLimite,
): Promise<ResultadoLimite> {
  if (!supabaseConfigurado()) return limitarIntentos(clave, regla);

  const claveHasheada = claveDeLimite(clave);
  try {
    const cupo = await consumirCupoServicio(
      claveHasheada,
      regla.maximo,
      Math.ceil(regla.ventanaMs / 1000),
    );
    return { permitido: cupo.permitido, segundosParaReintentar: cupo.segundosParaReintentar };
  } catch {
    // Evento propio y distinguible (LAB-49): sin la clave ni el email, solo el hecho de la falla.
    // Así una service key faltante o una base caída no pasa inadvertida.
    Sentry.captureException(
      new Error("consumir_cupo falló; el límite usa la memoria de la instancia"),
      {
        level: "error",
        tags: { componente: "rate-limit", evento: "consumir-cupo-respaldo-memoria" },
        fingerprint: ["rate-limit-consumir-cupo-respaldo-memoria"],
      },
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
