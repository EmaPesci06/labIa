import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { cronAutorizado } from "@/lib/emails/cron";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { limpiarFotosTrabajos } from "@/lib/trabajos/limpieza-fotos";

/**
 * Vercel Cron, diario (LAB-52): quita del bucket privado `fotos-trabajos` las fotos de los trabajos
 * cancelados, cerrados por moderación o terminados hace 30 días. Protegido con `CRON_SECRET`;
 * corre con la service role solo en servidor.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const resultado = await limpiarFotosTrabajos(crearClienteAdmin());
    return NextResponse.json(resultado);
  } catch (error) {
    // Sin datos personales: el error solo describe la falla (la base de Sentry limpia el resto).
    Sentry.captureException(error);
    return NextResponse.json({ error: "No se pudo limpiar las fotos" }, { status: 500 });
  }
}
