import { z } from "zod";

/** Tope de archivos por cuenta en el bucket `documentos`. Espejo de la política de Storage (LAB-21). */
export const MAX_DOCUMENTOS_POR_CUENTA = 12;

/** Motivos de rechazo: lista cerrada del panel de verificación (LAB-21). */
export const MOTIVOS_RECHAZO = [
  "Foto borrosa",
  "No se ve completo",
  "Certificado vencido (más de 90 días)",
  "El nombre no coincide",
  "Tiene antecedentes que impiden publicar",
  "Otro",
] as const;

export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number];

export const ACCIONES_DECISION = ["aprobar", "rechazar"] as const;

export const esquemaVerificacionId = z.object({
  verificacionId: z.uuid({ message: "La verificación no es válida." }),
});

/**
 * Decisión del admin sobre un documento. Con "rechazar" el motivo es obligatorio; con el motivo
 * "Otro", el texto también. El detalle es opcional en el resto de los casos.
 */
export const esquemaDecision = z
  .object({
    verificacionId: z.uuid({ message: "La verificación no es válida." }),
    accion: z.enum(ACCIONES_DECISION, { message: "Elegí aprobar o rechazar." }),
    motivo: z.enum(MOTIVOS_RECHAZO, { message: "Elegí un motivo de la lista." }).optional(),
    detalle: z
      .string()
      .trim()
      .max(300, "El detalle no puede superar los 300 caracteres.")
      .optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.accion !== "rechazar") return;
    if (!datos.motivo) {
      ctx.addIssue({
        code: "custom",
        path: ["motivo"],
        message: "Elegí un motivo para el rechazo.",
      });
    }
    if (datos.motivo === "Otro" && !datos.detalle) {
      ctx.addIssue({
        code: "custom",
        path: ["detalle"],
        message: "Contanos el motivo en el texto.",
      });
    }
  });

export type EntradaDecision = z.infer<typeof esquemaDecision>;

/**
 * Texto que se guarda como `motivo_rechazo`: el motivo y, si hay, el detalle. Coincide con lo que
 * arma `decidir_documento` en la base (máximo 500 caracteres).
 */
export function textoDelRechazo(motivo: MotivoRechazo, detalle?: string): string {
  const texto = detalle?.trim();
  return (texto ? `${motivo}: ${texto}` : motivo).slice(0, 500);
}
