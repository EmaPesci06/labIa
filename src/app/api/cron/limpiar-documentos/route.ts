import { NextResponse, type NextRequest } from "next/server";

import { cronAutorizado } from "@/lib/emails/cron";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { limpiarDocumentos } from "@/lib/verificacion/limpieza";

/**
 * Vercel Cron, diario (LAB-21): borra los documentos vencidos y los huérfanos del bucket privado.
 * Protegido con `CRON_SECRET`; corre con la service role solo en servidor.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const resultado = await limpiarDocumentos(crearClienteAdmin());
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "No se pudo limpiar los documentos" }, { status: 500 });
  }
}
