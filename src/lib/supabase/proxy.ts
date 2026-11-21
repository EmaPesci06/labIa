import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { esRutaAdmin, type EstadoUsuario, type RolUsuario } from "@/lib/auth/rutas";

import { OPCIONES_COOKIES_SESION } from "./cookies";
import type { Database } from "./tipos";

export type SesionProxy = {
  /** Respuesta con las cookies de sesión refrescadas; hay que devolverla (o copiar sus cookies). */
  respuesta: NextResponse;
  /** Rol de la cuenta, o `null` si no hay sesión (o la cuenta está suspendida). */
  rol: RolUsuario | null;
  /** Estado de la cuenta, o `null` si no hay sesión. */
  estado: EstadoUsuario | null;
};

/**
 * Refresca la sesión de Supabase en cada pedido (patrón de `@supabase/ssr`) y, si hace falta
 * decidir el acceso, lee el rol y estado de `public.usuarios` con la propia sesión (la RLS deja
 * leer solo la fila propia). Sin variables de Supabase no hay sesión y no se rompe nada.
 */
export async function refrescarSesion(request: NextRequest): Promise<SesionProxy> {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return { respuesta, rol: null, estado: null };

  const supabase = createServerClient<Database>(url, clave, {
    cookieOptions: OPCIONES_COOKIES_SESION,
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

  // getClaims() verifica la firma del JWT con la clave pública del proyecto (JWKS en memoria): no
  // se confía en la cookie sola y tampoco hay una ida y vuelta a Auth en cada pedido (LAB-88).
  // Refresca el token si venció. Quien sí revisa a la cuenta es la lectura de `usuarios`: una
  // cuenta suspendida o dada de baja no pasa aunque el token siga vigente.
  // `/admin` es la excepción: ahí se valida el token contra Auth (`getUser`), así una sesión
  // revocada no entra al panel (el layout no se vuelve a renderizar al navegar por RSC).
  const idUsuario = esRutaAdmin(request.nextUrl.pathname)
    ? (await supabase.auth.getUser()).data.user?.id
    : (await supabase.auth.getClaims()).data?.claims.sub;
  if (!idUsuario) return { respuesta, rol: null, estado: null };

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", idUsuario)
    .maybeSingle();
  const estado = fila ? (fila.estado as EstadoUsuario) : null;
  const rol = fila && fila.estado === "activa" ? fila.rol : null;
  return { respuesta, rol, estado };
}
