// Corre en el navegador antes de hidratar (convención de Next 16). Sin DSN no se inicializa.
import * as Sentry from "@sentry/nextjs";

import { opcionesSentry } from "@/lib/observabilidad/sentry";

const opciones = opcionesSentry(
  process.env.NEXT_PUBLIC_SENTRY_DSN,
  process.env.NEXT_PUBLIC_VERCEL_ENV,
);

if (opciones) Sentry.init(opciones);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
