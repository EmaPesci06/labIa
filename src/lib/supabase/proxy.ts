import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { RolUsuario } from "@/lib/auth/rutas";

import type { Database } from "./tipos";

export type SesionProxy = {
  /** Respuesta con las cookies de sesión refrescadas; hay que devolverla (o copiar sus cookies). */
  respuesta: NextResponse;
  /** Rol de la cuenta, o `null` si no hay sesión (o la cuenta está suspendida). */
  rol: RolUsuario | null;
};

/**
 * Refresca la sesión de Supabase en cada pedido (patrón de `@supabase/ssr`) y, si hace falta
 * decidir el acceso, lee el rol de `public.usuarios` con la propia sesión (la RLS deja leer solo
 * la fila propia). Sin variables de Supabase no hay sesión y no se rompe nada.
 */
export async function refrescarSesion(request: NextRequest): Promise<SesionProxy> {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return { respuesta, rol: null };

  const supabase = createServerClient<Database>(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (pendientes, encabezados) => {
        for (const { name, value } of pendientes) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of pendientes) {
          respuesta.cookies.set(name, value, options);
        }
        for (const [nombre, valor] of Object.entries(encabezados)) {
          respuesta.headers.set(nombre, valor);
        }
      },
    },
  });

  // getUser() valida el token con el servidor de Auth (no se confía en la cookie sola).
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { respuesta, rol: null };

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", data.user.id)
    .maybeSingle();
  const rol = fila && fila.estado === "activa" ? fila.rol : null;
  return { respuesta, rol };
}
