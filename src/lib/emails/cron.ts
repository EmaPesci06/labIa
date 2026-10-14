import { timingSafeEqual } from "node:crypto";

/**
 * Los crons de Vercel mandan `Authorization: Bearer <CRON_SECRET>`. Sin `CRON_SECRET` configurado
 * nadie está autorizado: el endpoint queda cerrado en vez de abierto.
 */
export function cronAutorizado(
  encabezado: string | null,
  secreto = process.env.CRON_SECRET,
): boolean {
  if (!secreto || !encabezado) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(encabezado);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
