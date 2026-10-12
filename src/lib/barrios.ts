import type { SupabaseClient } from "@supabase/supabase-js";

import { BARRIO_POR_DEFECTO } from "./busqueda-url";
import type { Database } from "./supabase/tipos";

export type Barrio = { id: number; nombre: string; slug: string };

/** Todos los barrios por nombre (lectura pública). Si falla, lista vacía: la pantalla sigue andando. */
export async function listarBarrios(supabase: SupabaseClient<Database>): Promise<Barrio[]> {
  const { data, error } = await supabase
    .from("barrios")
    .select("id, nombre, slug")
    .order("nombre", { ascending: true });
  if (error || !data) return [];
  return data;
}

/** Slug del barrio a usar: el pedido si existe; si no, el de la cuenta; si no, el Centro. */
export function elegirBarrio(
  barrios: readonly Barrio[],
  pedido: string | undefined,
  delUsuario: string | undefined,
): string {
  const existe = (slug: string | undefined): slug is string =>
    Boolean(slug) && (barrios.length === 0 || barrios.some((b) => b.slug === slug));
  if (existe(pedido)) return pedido;
  if (existe(delUsuario)) return delUsuario;
  if (existe(BARRIO_POR_DEFECTO)) return BARRIO_POR_DEFECTO;
  return barrios[0]?.slug ?? BARRIO_POR_DEFECTO;
}

export function nombreDeBarrio(barrios: readonly Barrio[], slug: string): string {
  return barrios.find((b) => b.slug === slug)?.nombre ?? slug;
}
