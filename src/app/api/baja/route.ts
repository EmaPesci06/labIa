import { NextResponse, type NextRequest } from "next/server";

import { aplicarBaja } from "@/lib/emails/baja";

/**
 * Baja de un solo paso para `List-Unsubscribe-Post` (Gmail y otros clientes la piden con POST).
 * Autoriza la firma del token, no la sesión.
 */
export async function POST(request: NextRequest) {
  const resultado = await aplicarBaja(request.nextUrl.searchParams.get("t"));
  if (resultado.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: resultado.motivo === "invalido" ? 400 : 500 });
}
