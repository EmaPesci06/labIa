import { z } from "zod";

import { sinDatosDeContacto } from "@/lib/validaciones/contenido-publico";

export const MENSAJE_CONTACTO_POSTULACION =
  "No pongas tu teléfono: si te eligen, el cliente te escribe.";
export const MENSAJE_SENA_MAYOR = "La seña no puede ser mayor al precio estimado.";

/** "$ 15.000" → 15000; vacío → undefined; otra cosa → NaN (falla la validación). */
function aPesos(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  const limpio = valor.replace(/[\s$.]/g, "");
  if (limpio === "") return undefined;
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
}

const sinContacto = (valor: string) => sinDatosDeContacto(valor);

export const esquemaPostulacion = z
  .object({
    mensaje: z
      .string({ error: "Escribí un mensaje para el cliente." })
      .trim()
      .min(20, "Escribí al menos 20 caracteres.")
      .max(500, "El mensaje no puede tener más de 500 caracteres.")
      .refine(sinContacto, MENSAJE_CONTACTO_POSTULACION),
    precioEstimado: z.preprocess(
      aPesos,
      z
        .number({ error: "Ingresá un número válido." })
        .int("Ingresá un número entero.")
        .min(0, "El precio no puede ser negativo.")
        .optional(),
    ),
    senaPropuesta: z.preprocess(
      aPesos,
      z
        .number({ error: "Ingresá un número válido." })
        .int("Ingresá un número entero.")
        .min(0, "La seña no puede ser negativa.")
        .optional(),
    ),
  })
  .refine(
    (datos) => {
      if (datos.precioEstimado !== undefined && datos.senaPropuesta !== undefined) {
        return datos.senaPropuesta <= datos.precioEstimado;
      }
      return true;
    },
    {
      message: MENSAJE_SENA_MAYOR,
      path: ["senaPropuesta"],
    },
  );

export type DatosPostulacion = z.infer<typeof esquemaPostulacion>;

export type ErroresPostulacion = Partial<
  Record<"mensaje" | "precioEstimado" | "senaPropuesta", string>
>;

export function erroresDePostulacion(error: z.ZodError<DatosPostulacion>): ErroresPostulacion {
  const resultado: ErroresPostulacion = {};
  for (const issue of error.issues) {
    const campo = issue.path[0] as keyof ErroresPostulacion;
    if (campo && !resultado[campo]) {
      resultado[campo] = issue.message;
    }
  }
  return resultado;
}
