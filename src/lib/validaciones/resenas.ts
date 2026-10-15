import { z } from "zod";

import { tieneDatosDeContacto } from "@/lib/validaciones/trabajo";

export const MENSAJE_CONTACTO_RESENA =
  "No incluyas números de teléfono ni correos electrónicos en el comentario.";
export const MENSAJE_PUNTAJE_INVALIDO = "Elegí una calificación de 1 a 5 estrellas.";
export const MENSAJE_TEXTO_LARGO = "El comentario no puede tener más de 500 caracteres.";

export const CHIPS_RAPIDOS = [
  "Puntual",
  "Prolijo",
  "Respetó el presupuesto",
  "Explicó bien",
] as const;

export const ETIQUETAS_PUNTAJE: Record<number, string> = {
  1: "Muy mal",
  2: "Mal",
  3: "Regular",
  4: "Bien",
  5: "Excelente",
};

const sinContacto = (valor: string | null | undefined) => {
  if (!valor) return true;
  return !tieneDatosDeContacto(valor);
};

export const esquemaGuardarResena = z.object({
  profesionalId: z
    .string({ error: "Identificador de profesional requerido." })
    .uuid("Identificador de profesional inválido."),
  trabajoId: z
    .string()
    .uuid("Identificador de trabajo inválido.")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  puntaje: z.coerce
    .number({ error: "Elegí una calificación." })
    .int(MENSAJE_PUNTAJE_INVALIDO)
    .min(1, MENSAJE_PUNTAJE_INVALIDO)
    .max(5, MENSAJE_PUNTAJE_INVALIDO),
  texto: z
    .string()
    .trim()
    .max(500, MENSAJE_TEXTO_LARGO)
    .refine(sinContacto, MENSAJE_CONTACTO_RESENA)
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const limpio = val.trim();
      return limpio.length > 0 ? limpio : null;
    }),
});

export const esquemaResena = esquemaGuardarResena;

export type EntradaGuardarResena = z.input<typeof esquemaGuardarResena>;
export type ResenaValidada = z.output<typeof esquemaGuardarResena>;
