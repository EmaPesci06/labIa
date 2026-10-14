import { documentosFaltantes, type TipoDocumento } from "@/lib/validaciones/documentos";

import type { ItemVerificacion } from "./tipos";

/**
 * Tipos con un documento vigente: el más nuevo de cada tipo, si no fue rechazado.
 * `verificaciones` viene ordenada de la más nueva a la más vieja.
 */
export function tiposVigentes(verificaciones: ItemVerificacion[]): Set<TipoDocumento> {
  const vistos = new Set<TipoDocumento>();
  const vigentes = new Set<TipoDocumento>();
  for (const v of verificaciones) {
    if (vistos.has(v.tipo)) continue;
    vistos.add(v.tipo);
    if (v.estado !== "rechazado") vigentes.add(v.tipo);
  }
  return vigentes;
}

/** Obligatorios que faltan según lo ya registrado en la base (lo que valida el servidor). */
export function faltantesRegistrados(
  verificaciones: ItemVerificacion[],
  tieneGas: boolean,
): TipoDocumento[] {
  return documentosFaltantes(tieneGas, tiposVigentes(verificaciones));
}
