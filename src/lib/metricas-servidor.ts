// Eventos de métricas desde el servidor (Server Actions, route handlers), con posthog-node.
// Misma lista cerrada que metricas.ts. Sin NEXT_PUBLIC_POSTHOG_KEY es no-op.

import { PostHog } from "posthog-node";

import type { ArgumentosEvento, NombreEvento } from "./metricas";

/**
 * `usuarioId` es el uuid de la persona que hizo la acción (el mismo que usa `identificarUsuario`
 * en el navegador). Nunca un email ni un teléfono.
 */
export async function registrarEventoServidor<N extends NombreEvento>(
  usuarioId: string,
  nombre: N,
  ...[propiedades]: ArgumentosEvento<N>
): Promise<void> {
  const clave = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!clave) return;

  // En serverless no hay proceso que viva para mandar en lote: se manda y se cierra.
  const cliente = new PostHog(clave, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  try {
    cliente.capture({ distinctId: usuarioId, event: nombre, properties: propiedades });
  } finally {
    // Una métrica perdida no puede romper la acción de la persona.
    await cliente.shutdown().catch(() => undefined);
  }
}
