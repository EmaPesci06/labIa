import { connection } from "next/server";

export type RolApp = "cliente" | "profesional";

export type SesionApp = {
  id: string;
  rol: RolApp;
  nombre: string;
};

/**
 * Sesión FALSA de la Fase 1 (LAB-13): el layout `(app)` necesita saber el rol para elegir la
 * navegación. La autenticación real llega con LAB-16, que reemplaza el cuerpo de esta función
 * (Supabase Auth) y deja la misma firma.
 *
 * El rol sale de `LABIA_ROL_DEV` ("cliente" por defecto). `LABIA_ID_DEV` es el id del profesional,
 * para armar el link a "Mi perfil".
 */
export async function obtenerSesion(): Promise<SesionApp> {
  // Se lee en cada pedido (no al compilar), así el rol se puede cambiar sin volver a construir.
  await connection();
  const rol: RolApp = process.env.LABIA_ROL_DEV === "profesional" ? "profesional" : "cliente";
  return rol === "profesional"
    ? { id: process.env.LABIA_ID_DEV || "demo", rol, nombre: "Martín Gómez" }
    : { id: "demo-cliente", rol, nombre: "Laura Fernández" };
}
