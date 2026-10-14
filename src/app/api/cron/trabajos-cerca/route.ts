import { NextResponse, type NextRequest } from "next/server";

import { cronAutorizado } from "@/lib/emails/cron";
import { enviarResumenTrabajosCerca } from "@/lib/emails/resumenes";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** Vercel Cron, 11:00 UTC = 8:00 en Argentina. Protegido con `CRON_SECRET`. */
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const enviados = await enviarResumenTrabajosCerca(crearClienteAdmin());
    return NextResponse.json({ enviados });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el resumen" }, { status: 500 });
  }
}
