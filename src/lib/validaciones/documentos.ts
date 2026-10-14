import { z } from "zod";

export const TIPOS_DOCUMENTO = ["dni_frente", "dni_dorso", "antecedentes", "matricula"] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  dni_frente: "DNI (frente)",
  dni_dorso: "DNI (dorso)",
  antecedentes: "Certificado de antecedentes",
  matricula: "Constancia de matrícula",
};

/**
 * Lo que acepta el selector de archivos. Las fotos (incluida WebP) se pasan a JPEG en el navegador
 * antes de subirlas; lo que llega al bucket es siempre JPEG, PNG o PDF.
 */
export const MIMES_DOCUMENTO_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const EXTENSIONES_ACEPTADAS = ["jpg", "jpeg", "png", "webp", "pdf"] as const;

export const MAX_BYTES_DOCUMENTO = 8 * 1024 * 1024; // 8 MB (límite del bucket documentos)

const EXTENSIONES_POR_MIME: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

export type ArchivoDocumento = { name: string; type: string; size: number };

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto + 1).toLowerCase();
}

/**
 * Valida un archivo elegido: tamaño, y que extensión Y tipo MIME coincidan (no alcanza con uno).
 * Devuelve el mensaje de error en castellano, o `null` si está bien.
 */
export function errorDeArchivoDocumento(archivo: ArchivoDocumento): string | null {
  if (archivo.size > MAX_BYTES_DOCUMENTO) return "El archivo no puede superar los 8 MB.";
  const extensiones = EXTENSIONES_POR_MIME[archivo.type];
  if (!extensiones?.includes(extensionDe(archivo.name))) {
    return "Formato no válido. Subí una imagen (JPG, PNG) o un PDF.";
  }
  return null;
}

/** Tipo real según los primeros bytes (magic bytes), o `null` si no es JPEG, PNG, WebP ni PDF. */
export function tipoPorCabecera(bytes: Uint8Array): string | null {
  const es = (inicio: number[], desde = 0) => inicio.every((b, i) => bytes[desde + i] === b);
  if (es([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (es([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (es([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (es([0x52, 0x49, 0x46, 0x46]) && es([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** Documentos que hacen falta para publicar el perfil. */
export function documentosObligatorios(tieneGas: boolean): TipoDocumento[] {
  return tieneGas
    ? ["dni_frente", "dni_dorso", "antecedentes", "matricula"]
    : ["dni_frente", "dni_dorso", "antecedentes"];
}

/** Obligatorios que todavía no están: ni elegidos ni subidos (un rechazado cuenta como faltante). */
export function documentosFaltantes(
  tieneGas: boolean,
  presentes: Iterable<TipoDocumento>,
): TipoDocumento[] {
  const set = new Set(presentes);
  return documentosObligatorios(tieneGas).filter((tipo) => !set.has(tipo));
}

export function mensajeDocumentosFaltantes(tieneGas: boolean): string {
  return tieneGas
    ? "Para publicar tu perfil necesitamos tu DNI, tu certificado de antecedentes y tu matrícula."
    : "Para publicar tu perfil necesitamos tu DNI y tu certificado de antecedentes.";
}

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
