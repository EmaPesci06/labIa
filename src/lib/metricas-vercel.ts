// Vercel Web Analytics y Speed Insights: antes de enviar, las URLs pierden query string y hash,
// donde puede viajar cualquier dato (teléfonos, tokens). Reutiliza `urlSinParametros` de metricas.ts.

import { urlSinParametros } from "@/lib/metricas";

/** `beforeSend` de Web Analytics y de Speed Insights: devuelve el evento con la URL limpia. */
export function limpiarEventoVercel<T extends { url: string }>(evento: T): T {
  return { ...evento, url: urlSinParametros(evento.url) };
}
