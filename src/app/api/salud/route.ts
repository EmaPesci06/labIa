import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { chequearBase, respuestaSalud, type ResultadoBase } from "@/lib/salud";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Chequeo de disponibilidad para el monitor externo (LAB-37). Usa la clave anon, sin sesión, y
 * lee solo la cantidad de barrios (tabla de lectura pública). 200 si la base responde, 503 si no.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let base: ResultadoBase = "error";
  if (url && clave) {
    const cliente = createClient<Database>(url, clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    base = await chequearBase(() =>
      cliente.from("barrios").select("id", { count: "exact", head: true }),
    );
  }

  const cuerpo = respuestaSalud(base);
  return NextResponse.json(cuerpo, {
    status: cuerpo.estado === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
