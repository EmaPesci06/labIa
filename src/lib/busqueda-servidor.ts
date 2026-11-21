import "server-only";

import { cache } from "react";

import { listarBarriosBusqueda, type Barrio } from "./barrios-busqueda";
import { crearClienteServidor, supabaseConfigurado } from "./supabase/servidor";
import type { SesionActual } from "./sesion";

/** Barrios (lectura pública), una sola consulta por pedido. Lista vacía si no hay Supabase. */
export const obtenerBarrios = cache(async (): Promise<Barrio[]> => {
  if (!supabaseConfigurado()) return [];
  return listarBarriosBusqueda(await crearClienteServidor());
});

/**
 * Slug del barrio guardado en la cuenta del usuario, o `undefined` (visitante, sin barrio, sesión
 * de desarrollo o error). El id viene en la sesión (`obtenerSesion` ya leyó la fila propia de
 * `usuarios`), así que solo queda buscar el slug en la lista de barrios: ninguna consulta extra (LAB-88).
 */
export const barrioDeLaCuenta = cache(
  async (sesion: SesionActual | null): Promise<string | undefined> => {
    if (!sesion?.barrioId) return undefined;
    const barrios = await obtenerBarrios();
    return barrios.find((b) => b.id === sesion.barrioId)?.slug;
  },
);
