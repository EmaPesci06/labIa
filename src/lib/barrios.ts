import "server-only";

import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import type { BarrioOpcion } from "@/lib/validaciones/registro-cliente";

/**
 * Todos los barrios de la tabla `barrios` (lectura pública), ordenados por nombre, para el
 * buscador de "Otro barrio". Sin Supabase o con un error devuelve `[]`: el formulario sigue
 * funcionando con los 7 barrios más comunes.
 */
export async function listarBarrios(): Promise<BarrioOpcion[]> {
  if (!supabaseConfigurado()) return [];
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("barrios").select("id, nombre").order("nombre");
  return error || !data ? [] : data;
}
