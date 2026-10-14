import "server-only";

import { obtenerSesion, type SesionActual } from "@/lib/sesion";

/**
 * Sesión del admin (rol `admin`, cuenta activa) o `null`. Lo usan `/admin/*` (layout y páginas) y
 * cada Server Action del panel: la protección no depende solo del proxy (LAB-21).
 */
export async function sesionAdmin(): Promise<SesionActual | null> {
  const sesion = await obtenerSesion();
  return sesion?.rol === "admin" ? sesion : null;
}
