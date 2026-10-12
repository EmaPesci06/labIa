import { z } from "zod";

export const TIPOS_DOCUMENTO = ["dni_frente", "dni_dorso", "antecedentes", "matricula"] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  dni_frente: "DNI (frente)",
  dni_dorso: "DNI (dorso)",
  antecedentes: "Certificado de antecedentes",
  matricula: "Constancia de matrícula",
};

export const MIMES_DOCUMENTO_ACEPTADOS = ["image/jpeg", "image/png", "application/pdf"] as const;

export const EXTENSIONES_ACEPTADAS = ["jpg", "jpeg", "png", "pdf"] as const;

export const MAX_BYTES_DOCUMENTO = 8 * 1024 * 1024; // 8 MB (límite del bucket documentos)

const REGEX_RUTA_BASE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(dni_frente|dni_dorso|antecedentes|matricula)-[0-9]+\.(jpg|jpeg|png|pdf)$/;

/**
 * Valida que una ruta corresponda al bucket privado `documentos` para ese usuario y tipo.
 * Formato: `<usuario_id>/<tipo>-<timestamp>.<ext>`.
 */
export function esRutaDocumento(ruta: string, usuarioId: string, tipo?: TipoDocumento): boolean {
  if (!REGEX_RUTA_BASE.test(ruta)) return false;
  const prefijo = tipo ? `${usuarioId}/${tipo}-` : `${usuarioId}/`;
  return ruta.startsWith(prefijo);
}

/**
 * Genera la ruta en el bucket `documentos` para un archivo nuevo.
 */
export function generarRutaDocumento(
  usuarioId: string,
  tipo: TipoDocumento,
  extension: string,
): string {
  const extLimpia = extension.replace(/^\./, "").toLowerCase();
  const extFinal = extLimpia === "jpeg" ? "jpg" : extLimpia;
  return `${usuarioId}/${tipo}-${Date.now()}.${extFinal}`;
}

export const esquemaDocumento = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO, {
    message: "El tipo de documento no es válido.",
  }),
  storagePath: z.string().min(1, "Falta la ruta del archivo."),
});

export type EntradaDocumento = z.infer<typeof esquemaDocumento>;
