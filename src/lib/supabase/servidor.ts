import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./tipos";

/** ¿Están cargadas las variables públicas de Supabase? Sin ellas no hay sesión posible. */
export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers: usa la clave anon
 * y las cookies del usuario, así que la RLS aplica. El refresco de la sesión lo hace `proxy.ts`.
 */
export async function crearClienteServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    throw new Error("Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y _ANON_KEY).");
  }
  const almacen = await cookies();

  return createServerClient<Database>(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (pendientes) => {
        try {
          for (const { name, value, options } of pendientes) almacen.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies: lo hace el proxy.
        }
      },
    },
  });
}
