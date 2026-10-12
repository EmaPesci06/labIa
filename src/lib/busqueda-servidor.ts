import "server-only";

import { cache } from "react";

import { listarBarrios, type Barrio } from "./barrios";
import { crearClienteServidor, supabaseConfigurado } from "./supabase/servidor";
import type { SesionActual } from "./sesion";

/** Barrios (lectura pública), una sola consulta por pedido. Lista vacía si no hay Supabase. */
export const obtenerBarrios = cache(async (): Promise<Barrio[]> => {
  if (!supabaseConfigurado()) return [];
  return listarBarrios(await crearClienteServidor());
});

/**
 * Slug del barrio guardado en la cuenta del usuario, o `undefined` (visitante, sin barrio, sesión
 * de desarrollo o error). Solo lee la fila propia: la RLS lo permite (`usuarios_leer_propio`).
 */
export const barrioDeLaCuenta = cache(
  async (sesion: SesionActual | null): Promise<string | undefined> => {
    if (!sesion || !supabaseConfigurado()) return undefined;
    // La sesión falsa de desarrollo no tiene id de base: un uuid inválido solo daría error.
    if (!/^[0-9a-f-]{36}$/i.test(sesion.usuario.id)) return undefined;
    const supabase = await crearClienteServidor();
    const { data } = await supabase
      .from("usuarios")
      .select("barrio_id")
      .eq("id", sesion.usuario.id)
      .maybeSingle();
    if (!data?.barrio_id) return undefined;
    const barrios = await obtenerBarrios();
    return barrios.find((b) => b.id === data.barrio_id)?.slug;
  },
);
