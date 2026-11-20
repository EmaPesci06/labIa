import type { SesionActual } from "@/lib/sesion";

/** Pantalla donde un cliente sin el alta completa la termina (WhatsApp, barrio y la casilla). */
export const RUTA_COMPLETAR_ALTA = "/registro/cliente/completar";

export const MENSAJE_ALTA_INCOMPLETA =
  "Primero terminá tu registro: confirmá que sos mayor de 18 y aceptá los términos.";

/**
 * Un cliente que todavía no aceptó "mayor de 18 y términos" no usa la plataforma: ni contacta, ni
 * publica, ni guarda datos. Pasa con las cuentas nuevas de Google, que no pasan por el formulario
 * de registro. Lo exigen el armazón de `(app)` (para redirigir) y las Server Actions (la defensa
 * real: una acción se puede invocar desde cualquier ruta). Profesionales y admin no usan esta casilla.
 */
export function altaIncompleta(sesion: Pick<SesionActual, "rol" | "terminosAceptados">): boolean {
  return sesion.rol === "cliente" && !sesion.terminosAceptados;
}
