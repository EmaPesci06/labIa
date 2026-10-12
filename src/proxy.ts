import { NextResponse, type NextRequest } from "next/server";

import { decidirAcceso, necesitaSesion } from "@/lib/auth/rutas";
import { rolFalso } from "@/lib/auth/sesion-falsa";
import { refrescarSesion } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware", Next 16): refresca la sesión de Supabase y protege las rutas (LAB-16).
 * Solo corre la consulta de sesión en las rutas que la necesitan. La decisión (a quién se deja
 * pasar) vive en `decidirAcceso`, que tiene tests.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!necesitaSesion(pathname)) return NextResponse.next();

  // Sesión falsa de desarrollo/e2e: no se consulta a Supabase.
  const falso = rolFalso();
  const { respuesta, rol } = falso
    ? { respuesta: NextResponse.next(), rol: falso }
    : await refrescarSesion(request);

  const decision = decidirAcceso(pathname, search, rol);
  if (decision.tipo === "pasar") return respuesta;

  // Se devuelven las cookies refrescadas también en redirecciones y 404.
  const destino =
    decision.tipo === "redirigir"
      ? NextResponse.redirect(new URL(decision.destino, request.url))
      : NextResponse.rewrite(new URL("/ruta-inexistente-404", request.url), { status: 404 });
  for (const cookie of respuesta.cookies.getAll()) destino.cookies.set(cookie);
  destino.headers.set("cache-control", "no-store");
  return destino;
}

export const config = {
  // Todo menos archivos estáticos, imágenes y el service worker.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2|txt|xml)$).*)",
  ],
};
