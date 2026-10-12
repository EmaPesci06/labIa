import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

// Errores de Server Components, Route Handlers y Server Actions. Sin DSN Sentry no está
// inicializado y esto no manda nada.
export const onRequestError = Sentry.captureRequestError;
