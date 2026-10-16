import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { limiteSaludPorIp } from "@/lib/limites";
import {
  chequearBase,
  guardarSaludCacheada,
  leerSaludCacheada,
  respuestaSalud,
  type ResultadoBase,
} from "@/lib/salud";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Chequeo de disponibilidad para el monitor externo (LAB-37). Usa la clave anon, sin sesión, y
 * lee solo la cantidad de barrios (tabla de lectura pública). 200 si la base responde, 503 si no.
 *
 * Amplificación (B-13, LAB-54): la respuesta de la base se cachea 15 segundos en memoria del proceso,
 * antes del limitador, así que un flujo de pedidos no escribe en la base en cada uno. Por encima del
 * tope por IP responde 429 sin consultar la base.
 */
export async function GET() {
  const cacheada = leerSaludCacheada();
  if (cacheada) return respuesta(cacheada.cuerpo, cacheada.status);

  const limite = await limiteSaludPorIp();
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiados pedidos." },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(limite.segundosParaReintentar),
        },
      },
    );
  }

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
  const status = cuerpo.estado === "ok" ? 200 : 503;
  guardarSaludCacheada(cuerpo, status);
  return respuesta(cuerpo, status);
}

function respuesta(cuerpo: ReturnType<typeof respuestaSalud>, status: number) {
  return NextResponse.json(cuerpo, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
