/**
 * Paginación de la lista de trabajos del profesional (LAB-46), con el mismo criterio que la búsqueda
 * (LAB-23): `pagina=N` en la URL y "Ver más" que suma una página sin perder lo que ya se veía.
 * La lista se pide en una sola consulta: `limiteParaPagina` trae las páginas 1..N juntas.
 */

export const TRABAJOS_POR_PAGINA = 20;

/** Tope de páginas acumuladas: `trabajos_para_mi` devuelve como máximo 100 filas por consulta. */
export const MAX_PAGINAS_TRABAJOS = 5;

/** Lee `pagina` de la URL: entero desde 1, con tope en MAX_PAGINAS_TRABAJOS. Lo inválido es 1. */
export function leerPaginaTrabajos(valor: string | undefined): number {
  const numero = Number.parseInt(valor ?? "", 10);
  if (!Number.isFinite(numero) || numero < 1) return 1;
  return Math.min(numero, MAX_PAGINAS_TRABAJOS);
}

/** Filas a pedir para mostrar las páginas 1..pagina juntas. */
export function limiteParaPagina(pagina: number): number {
  return pagina * TRABAJOS_POR_PAGINA;
}

/** ¿Se puede pedir más con "Ver más"? Hay trabajos sin mostrar y todavía queda margen de páginas. */
export function hayMasTrabajos(cargados: number, total: number, pagina: number): boolean {
  return cargados < total && pagina < MAX_PAGINAS_TRABAJOS;
}

/** ¿Se llegó al tope de páginas con trabajos todavía sin mostrar? */
export function alcanzoElTopeDePaginas(cargados: number, total: number, pagina: number): boolean {
  return cargados < total && pagina >= MAX_PAGINAS_TRABAJOS;
}

/** URL de la lista con la página indicada, conservando los filtros que están activos. */
export function urlTrabajosConPagina(
  filtros: { oficio?: string | null; zonas?: string | null; trabajo?: string | null },
  pagina: number,
): string {
  const params = new URLSearchParams();
  if (filtros.oficio) params.set("oficio", filtros.oficio);
  if (filtros.zonas) params.set("zonas", filtros.zonas);
  if (filtros.trabajo) params.set("trabajo", filtros.trabajo);
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `/trabajos?${query}` : "/trabajos";
}
