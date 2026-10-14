import type { Oficio } from "@/lib/busqueda";
import { ETIQUETA_OFICIO } from "@/lib/validaciones/trabajo";

/**
 * Formatea la bajada del título de /trabajos ("Gas, Plomería · La Perla, Centro" o "Gas · Toda la ciudad").
 */
export function formatearBajadaTrabajos(
  oficios: Oficio[],
  zonasNombres: string[],
  todaLaCiudad: boolean,
): string {
  const textoOficios = oficios.map((o) => ETIQUETA_OFICIO[o] ?? o).join(", ");
  const textoZonas = todaLaCiudad
    ? "Toda la ciudad"
    : zonasNombres.length > 0
      ? zonasNombres.join(", ")
      : "Mar del Plata";

  if (!textoOficios) return textoZonas;
  return `${textoOficios} · ${textoZonas}`;
}
