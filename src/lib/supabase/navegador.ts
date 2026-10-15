import { createBrowserClient } from "@supabase/ssr";

import { OPCIONES_COOKIES_SESION } from "./cookies";
import type { Database } from "./tipos";

/** Cliente de Supabase para componentes de cliente (clave anon; la RLS aplica). */
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    throw new Error("Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y _ANON_KEY).");
  }
  return createBrowserClient<Database>(url, clave, { cookieOptions: OPCIONES_COOKIES_SESION });
}
