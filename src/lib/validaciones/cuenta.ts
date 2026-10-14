import { z } from "zod";

import { email, barrio, nombreCompleto, whatsapp } from "./registro-cliente";

/** Palabra que hay que escribir para confirmar el borrado de la cuenta. */
export const PALABRA_BORRAR = "BORRAR";

/** "Mis datos": nombre, WhatsApp y barrio. Valida igual que el registro. */
export const esquemaDatosCuenta = z.object({ nombreCompleto, whatsapp, barrio });

/** Contraseña actual: se pide para cambiar el email o la contraseña (cuentas con contraseña). */
function contrasenaActual() {
  return z
    .string({ error: "Ingresá tu contraseña actual." })
    .min(1, "Ingresá tu contraseña actual.")
    .max(200, "La contraseña es demasiado larga.");
}

export const esquemaContrasenaActual = z.object({ actual: contrasenaActual() });

/** Cambio de email: el nuevo tiene que ser un email válido (se confirma por mail). */
export const esquemaCambiarEmail = z.object({ email, actual: contrasenaActual() });

/**
 * Borrar la cuenta: hay que escribir BORRAR. La contraseña se pide aparte, solo a quienes
 * ingresan con email y contraseña (los de Google reautentican con Google).
 */
export const esquemaBorrarCuenta = z.object({
  confirmacion: z
    .string({ error: `Escribí ${PALABRA_BORRAR} para confirmar.` })
    .trim()
    .refine((valor) => valor === PALABRA_BORRAR, {
      error: `Escribí ${PALABRA_BORRAR}, en mayúsculas, para confirmar.`,
    }),
  contrasena: z.string().max(200, "La contraseña es demasiado larga.").optional(),
});
