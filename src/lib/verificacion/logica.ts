import type { EstadoVerificacionDocumento, ItemVerificacion } from "@/lib/registro/tipos";
import {
  ETIQUETAS_DOCUMENTO,
  extensionDe,
  tipoPorCabecera,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";

/** Motivo que pone `registrar_documento` al reemplazar un pendiente: no es una decisión del admin. */
export const MOTIVO_REEMPLAZO = "Reemplazado por un documento nuevo";

/** Desde cuántas horas de espera la fila se marca en rojo en el panel. */
export const HORAS_ESPERA_LARGA = 48;

export type Pestana = "pendientes" | "rechazados" | "aprobados";

export const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "pendientes", etiqueta: "Pendientes" },
  { valor: "rechazados", etiqueta: "Rechazados" },
  { valor: "aprobados", etiqueta: "Aprobados" },
];

export function esPestana(valor: string | undefined): valor is Pestana {
  return PESTANAS.some((p) => p.valor === valor);
}

/** Un documento tal como lo ve el admin (sin la ruta del archivo). */
export type DocumentoAdmin = {
  id: string;
  tipo: TipoDocumento;
  estado: EstadoVerificacionDocumento;
  motivoRechazo: string | null;
  createdAt: string;
  revisadoAt: string | null;
  /** El archivo ya lo borró el job de retención. */
  archivoBorrado: boolean;
};

/**
 * Pestaña de un profesional según sus documentos: con algo pendiente, en "Pendientes"; si no, con
 * algo rechazado, en "Rechazados"; si todo está aprobado, en "Aprobados". `null` si no tiene nada
 * cargado (no aparece en el panel).
 */
export function pestanaDe(documentos: { estado: EstadoVerificacionDocumento }[]): Pestana | null {
  if (documentos.length === 0) return null;
  if (documentos.some((d) => d.estado === "pendiente")) return "pendientes";
  if (documentos.some((d) => d.estado === "rechazado")) return "rechazados";
  return "aprobados";
}

/** Fecha más vieja entre los documentos pendientes (desde cuándo espera), o `null`. */
export function pendienteDesde(documentos: DocumentoAdmin[]): string | null {
  const fechas = documentos
    .filter((d) => d.estado === "pendiente")
    .map((d) => d.createdAt)
    .sort();
  return fechas[0] ?? null;
}

/** ¿Espera más de `HORAS_ESPERA_LARGA` horas desde `desde`? */
export function esperaLarga(desde: string, ahora: Date = new Date()): boolean {
  return ahora.getTime() - new Date(desde).getTime() > HORAS_ESPERA_LARGA * 3_600_000;
}

export type ResumenBanner =
  { tipo: "en_revision" } | { tipo: "rechazado"; documento: string; motivo: string };

/**
 * Qué mostrar al profesional en su banner (LAB-21): "en revisión" si hay algo pendiente; si no, el
 * último rechazo vigente de algún tipo. Los reemplazos automáticos no cuentan como rechazo.
 * `items` viene ordenada de la más nueva a la más vieja (como `obtenerMisVerificaciones`).
 */
export function resumenBannerVerificacion(items: ItemVerificacion[]): ResumenBanner | null {
  if (items.some((i) => i.estado === "pendiente")) return { tipo: "en_revision" };

  const vistos = new Set<TipoDocumento>();
  for (const item of items) {
    if (vistos.has(item.tipo)) continue;
    vistos.add(item.tipo);
    if (
      item.estado === "rechazado" &&
      item.motivoRechazo &&
      item.motivoRechazo !== MOTIVO_REEMPLAZO
    ) {
      return {
        tipo: "rechazado",
        documento: ETIQUETAS_DOCUMENTO[item.tipo],
        motivo: item.motivoRechazo,
      };
    }
  }
  return null;
}

/** Tipo MIME que corresponde a la extensión de la ruta del documento, o `null` si no es válida. */
export function mimeDeRuta(ruta: string): string | null {
  const extension = extensionDe(ruta);
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return null;
}

/**
 * Qué se puede mostrar al admin: el contenido real (magic bytes) tiene que ser JPEG, PNG o PDF y
 * coincidir con la extensión que declaró el profesional. El MIME lo declara el cliente, así que
 * no alcanza con mirarlo. `null` = no mostrar.
 */
export function formatoVisible(bytes: Uint8Array, ruta: string): "imagen" | "pdf" | null {
  const real = tipoPorCabecera(bytes);
  if (!real || real !== mimeDeRuta(ruta)) return null;
  return real === "application/pdf" ? "pdf" : "imagen";
}
