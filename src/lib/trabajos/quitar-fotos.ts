import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/tipos";

/** Bucket privado de las fotos de trabajos (LAB-52). Las rutas son `<cliente_id>/<trabajo_id>/…`. */
export const BUCKET_FOTOS_TRABAJOS = "fotos-trabajos";

/** Tamaño de página al listar la carpeta de un trabajo. */
export const TAMANO_PAGINA_LISTADO = 100;

/** Tope de páginas: evita un bucle infinito si el servidor ignora el desplazamiento. */
const MAXIMO_PAGINAS = 100;

/**
 * Lista todos los archivos de una carpeta, paginando hasta vaciarla. Devuelve `null` si Storage falla
 * o si la carpeta supera el tope de páginas (en ese caso no se borra nada a medias).
 */
async function listarTodos(
  supabase: SupabaseClient<Database>,
  carpeta: string,
): Promise<string[] | null> {
  const almacen = supabase.storage.from(BUCKET_FOTOS_TRABAJOS);
  const nombres: string[] = [];
  for (let pagina = 0; pagina < MAXIMO_PAGINAS; pagina += 1) {
    const { data, error } = await almacen.list(carpeta, {
      limit: TAMANO_PAGINA_LISTADO,
      offset: pagina * TAMANO_PAGINA_LISTADO,
    });
    if (error) return null;
    const archivos = (data ?? []).filter((a) => a.id !== null);
    nombres.push(...archivos.map((a) => a.name));
    if ((data ?? []).length < TAMANO_PAGINA_LISTADO) return nombres;
  }
  return null;
}

/**
 * Quita del bucket toda la carpeta `<cliente>/<trabajo>/`: lista lo que haya (con paginación) y lo
 * borra, sin fiarse solo de `trabajos.fotos` (LAB-52). Con el cliente de la sesión lo aplica la policy
 * de delete del dueño; con la service role (admin y cron) borra cualquier carpeta. Devuelve `ok: false`
 * si Storage falla, y entonces el trabajo queda para el job diario.
 */
export async function quitarFotosDelTrabajo(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  trabajoId: string,
): Promise<{ ok: boolean; quitadas: number }> {
  const carpeta = `${clienteId}/${trabajoId}`;
  const nombres = await listarTodos(supabase, carpeta);
  if (nombres === null) return { ok: false, quitadas: 0 };

  const archivos = nombres.map((nombre) => `${carpeta}/${nombre}`);
  if (archivos.length === 0) return { ok: true, quitadas: 0 };

  const { error: errorBorrado } = await supabase.storage
    .from(BUCKET_FOTOS_TRABAJOS)
    .remove(archivos);
  if (errorBorrado) return { ok: false, quitadas: 0 };
  return { ok: true, quitadas: archivos.length };
}
