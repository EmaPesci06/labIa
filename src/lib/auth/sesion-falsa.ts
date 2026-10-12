import type { RolUsuario } from "./rutas";

/**
 * Sesión FALSA solo para desarrollo y Playwright (queda de LAB-13): con `LABIA_ROL_DEV` definido,
 * la app se comporta como si hubiera ese usuario, sin Supabase. En producción se ignora, salvo con
 * `LABIA_PERMITIR_ROL_DEV=1`, bandera que solo usa Playwright (corre contra un build de
 * producción). No cargues ninguna de las tres en Vercel.
 */
export function rolFalso(): "cliente" | "profesional" | null {
  const permitido =
    process.env.NODE_ENV !== "production" || process.env.LABIA_PERMITIR_ROL_DEV === "1";
  if (!permitido) return null;
  const rol: RolUsuario | string | undefined = process.env.LABIA_ROL_DEV;
  return rol === "profesional" || rol === "cliente" ? rol : null;
}
