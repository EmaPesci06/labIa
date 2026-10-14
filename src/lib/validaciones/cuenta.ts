import { z } from "zod";

import { email, barrio, nombreCompleto, whatsapp } from "./registro-cliente";

/** Palabra que hay que escribir para confirmar el borrado de la cuenta. */
export const PALABRA_BORRAR = "BORRAR";

/** "Mis datos": nombre, WhatsApp y barrio. Valida igual que el registro. */
export const esquemaDatosCuenta = z.object({ nombreCompleto, whatsapp, barrio });

/** Cambio de email: el nuevo tiene que ser un email válido (se confirma por mail). */
export const esquemaCambiarEmail = z.object({ email });

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
