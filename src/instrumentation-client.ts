// Corre en el navegador antes de hidratar (convención de Next 16). Sin DSN no se inicializa.
import { config as configurarZod } from "zod";
import * as Sentry from "@sentry/nextjs";

import { opcionesSentry } from "@/lib/observabilidad/sentry";

// Zod sondea `new Function` para elegir su camino rápido. Con una CSP sin 'unsafe-eval' esa sonda
// queda registrada como violación en la consola, aunque el error se capture. `jitless` la omite y
// no cambia los resultados de validación (LAB-55).
configurarZod({ jitless: true });

const opciones = opcionesSentry(
  process.env.NEXT_PUBLIC_SENTRY_DSN,
  process.env.NEXT_PUBLIC_VERCEL_ENV,
);

if (opciones) Sentry.init(opciones);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
