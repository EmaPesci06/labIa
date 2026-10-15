import { NextResponse, type NextRequest } from "next/server";

import { borrarDocumentosVencidos } from "@/lib/documentos/limpieza";
import { cronAutorizado } from "@/lib/emails/cron";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Vercel Cron, diario (LAB-42): borra los documentos de verificación (DNI, antecedentes)
 * con más de 30 días de revisados y huérfanos de más de 24 horas del bucket privado `documentos`.
 * Protegido con `CRON_SECRET`; corre con la service role solo en el servidor.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const resultado = await borrarDocumentosVencidos(crearClienteAdmin());
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "No se pudieron borrar los documentos" }, { status: 500 });
  }
}
