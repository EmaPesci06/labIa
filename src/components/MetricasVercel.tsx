"use client";

// Vercel Web Analytics y Speed Insights. Solo reportan en despliegues de Vercel (en local y en CI
// no hacen nada útil). `beforeSend` quita query string y hash de cada URL: sin datos personales.

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { limpiarEventoVercel } from "@/lib/metricas-vercel";

export function MetricasVercel() {
  return (
    <>
      <Analytics beforeSend={limpiarEventoVercel} />
      <SpeedInsights beforeSend={limpiarEventoVercel} />
    </>
  );
}
