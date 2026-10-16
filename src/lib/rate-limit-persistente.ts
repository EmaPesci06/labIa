import { createHash, createHmac } from "node:crypto";

import * as Sentry from "@sentry/nextjs";

import { ipDelPedido } from "@/lib/ip-del-pedido";
import { limitarIntentos, type ResultadoLimite } from "@/lib/rate-limit";
import { consumirCupoServicio } from "@/lib/rate-limit-servicio";
import { supabaseConfigurado } from "@/lib/supabase/servidor";

/** Máximo de intentos dentro de una ventana de tiempo. */
export type ReglaLimite = { maximo: number; ventanaMs: number };

/**
 * Dice si este proceso tiene que exigir `RATE_LIMIT_SECRET`. Lo exige cualquier build o servidor de
 * producción (`NODE_ENV=production`: `pnpm start` local, la CI de e2e y los deploys de Vercel, también
 * los de Preview) y, por si el flag se pierde, los entornos de Vercel Production y Preview. No lo exigen
 * `next dev` ni vitest (`NODE_ENV` development o test sin `VERCEL_ENV`).
 */
export function exigeSecretoDeLimite(): boolean {
  const entornoVercel = process.env.VERCEL_ENV;
  return (
    process.env.NODE_ENV === "production" ||
    entornoVercel === "production" ||
    entornoVercel === "preview"
  );
}

/** Largo mínimo de `RATE_LIMIT_SECRET` (LAB-57): el mismo que `EMAILS_SECRET`. */
export const LARGO_MINIMO_SECRETO_LIMITE = 32;

/**
 * Clave que va a la tabla: HMAC-SHA256 con el secreto del servidor. Si el entorno lo exige y falta,
 * lanza: nunca se guarda una clave sin llave que se pueda revertir por fuerza bruta (LAB-49). Solo en
 * desarrollo y tests, sin secreto, se usa sha256. Un secreto de menos de 32 caracteres se trata como
 * si no estuviera configurado (LAB-57, igual que `EMAILS_SECRET`).
 */
export function claveDeLimite(clave: string): string {
  const secreto = process.env.RATE_LIMIT_SECRET;
  if (secreto && secreto.length >= LARGO_MINIMO_SECRETO_LIMITE) {
    return createHmac("sha256", secreto).update(clave).digest("hex");
  }
  if (exigeSecretoDeLimite()) {
    throw new Error(
      "RATE_LIMIT_SECRET es obligatorio en producción y preview (al menos 32 caracteres): no se guardan claves sin llave.",
    );
  }
  return createHash("sha256").update(clave).digest("hex");
}

/**
 * Cuenta un intento en Postgres (`public.consumir_cupo`, con la service role desde el servidor), así
 * que el límite se comparte entre todas las instancias de Vercel. La clave se guarda con HMAC-SHA256
 * (secreto `RATE_LIMIT_SECRET`) para que la tabla no tenga emails ni IPs en claro y no se puedan
 * recalcular desde fuera. Si falta el secreto en producción o preview, lanza (la acción muestra la
 * página de error); solo en dev y test cae a sha256.
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
