import { NextResponse, type NextRequest } from "next/server";

import { vaciarPostulacionesPendientes } from "@/lib/emails/avisos";
import { cronAutorizado } from "@/lib/emails/cron";
import { enviarPedidosDeResena } from "@/lib/emails/resumenes";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Vercel Cron, una vez por día (12:00 UTC = 9:00 en Argentina; Hobby no admite más). Pide reseñas 24 h después de terminar un trabajo y, de paso, manda los
 * avisos de postulaciones que esperaban para agruparse. Protegido con `CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!cronAutorizado(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const admin = crearClienteAdmin();
    const resenas = await enviarPedidosDeResena(admin);
    const postulaciones = await vaciarPostulacionesPendientes(admin);
    return NextResponse.json({ resenas, postulaciones });
  } catch {
    return NextResponse.json({ error: "No se pudo completar el trabajo" }, { status: 500 });
  }
}
