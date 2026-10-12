// Sentry en el servidor Node (lo carga src/instrumentation.ts). Sin DSN no se inicializa.
import * as Sentry from "@sentry/nextjs";

import { opcionesSentry } from "@/lib/observabilidad/sentry";

const opciones = opcionesSentry(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  process.env.VERCEL_ENV,
);

if (opciones) Sentry.init(opciones);
