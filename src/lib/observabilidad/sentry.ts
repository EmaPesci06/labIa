// Opciones comunes de Sentry para navegador, servidor y edge (LAB-15).
// Si no hay DSN, `opcionesSentry` devuelve `null` y no se inicializa nada.

import { limpiarEvento } from "./privacidad";

export type EntornoSentry = "development" | "preview" | "production";

/** `VERCEL_ENV` manda; fuera de Vercel (local, CI) siempre es `development`. */
export function entornoSentry(vercelEnv: string | undefined): EntornoSentry {
  return vercelEnv === "production" || vercelEnv === "preview" ? vercelEnv : "development";
}

export interface OpcionesSentry {
  dsn: string;
  environment: EntornoSentry;
  tracesSampleRate: number;
  sendDefaultPii: false;
  beforeSend: <T extends object>(evento: T) => T;
  beforeSendSpan: <T extends object>(span: T) => T;
  beforeBreadcrumb: <T extends object>(miga: T) => T;
}

export function opcionesSentry(
  dsn: string | undefined,
  vercelEnv: string | undefined,
): OpcionesSentry | null {
  if (!dsn) return null;
  const environment = entornoSentry(vercelEnv);
  return {
    dsn,
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 1,
    sendDefaultPii: false,
    beforeSend: limpiarEvento,
    // Con span streaming (default de v11) las trazas pasan por acá, no por beforeSendTransaction.
    beforeSendSpan: limpiarEvento,
    beforeBreadcrumb: limpiarEvento,
  };
}
