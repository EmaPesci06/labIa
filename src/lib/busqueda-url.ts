import type { Oficio, OrdenBusqueda } from "./busqueda";

/** Estado de la búsqueda que viaja en la URL (la URL es el estado: compartible y con botón atrás). */
export type EstadoBusqueda = {
  oficio?: Oficio | undefined;
  barrio: string;
  matriculados?: boolean;
  orden?: OrdenBusqueda;
  todaLaCiudad?: boolean;
  pagina?: number;
};

/** Barrio que se usa cuando no hay ninguno elegido ni guardado en la cuenta. */
export const BARRIO_POR_DEFECTO = "centro";

/**
 * `/buscar?oficio=gas&barrio=la-perla&matriculados=1&orden=calificacion&toda_la_ciudad=1&pagina=2`.
 * Los valores por defecto (sin filtro, por cercanía, página 1) no se escriben.
 */
export function urlBusqueda(estado: EstadoBusqueda): string {
  const params = new URLSearchParams();
  if (estado.oficio) params.set("oficio", estado.oficio);
  params.set("barrio", estado.barrio);
  if (estado.matriculados) params.set("matriculados", "1");
  if (estado.orden === "calificacion") params.set("orden", "calificacion");
  if (estado.todaLaCiudad) params.set("toda_la_ciudad", "1");
  if (estado.pagina && estado.pagina > 1) params.set("pagina", String(estado.pagina));
  return `/buscar?${params.toString()}`;
}
