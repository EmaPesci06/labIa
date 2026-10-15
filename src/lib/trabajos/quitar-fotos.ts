import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/tipos";

/** Bucket privado de las fotos de trabajos (LAB-52). Las rutas son `<cliente_id>/<trabajo_id>/…`. */
export const BUCKET_FOTOS_TRABAJOS = "fotos-trabajos";

/**
 * Quita del bucket toda la carpeta `<cliente>/<trabajo>/`: lista lo que haya y lo borra, sin fiarse
 * solo de `trabajos.fotos` (LAB-52). Con el cliente de la sesión lo aplica la policy de delete del
 * dueño; con la service role (admin y cron) borra cualquier carpeta. Devuelve `ok: false` si Storage
 * falla, y entonces el trabajo queda para el job diario.
 */
export async function quitarFotosDelTrabajo(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  trabajoId: string,
): Promise<{ ok: boolean; quitadas: number }> {
  const carpeta = `${clienteId}/${trabajoId}`;
  const almacen = supabase.storage.from(BUCKET_FOTOS_TRABAJOS);
  const { data, error } = await almacen.list(carpeta, { limit: 1000 });
  if (error) return { ok: false, quitadas: 0 };

  const archivos = (data ?? []).filter((a) => a.id !== null).map((a) => `${carpeta}/${a.name}`);
  if (archivos.length === 0) return { ok: true, quitadas: 0 };

  const { error: errorBorrado } = await almacen.remove(archivos);
  if (errorBorrado) return { ok: false, quitadas: 0 };
  return { ok: true, quitadas: archivos.length };
}
