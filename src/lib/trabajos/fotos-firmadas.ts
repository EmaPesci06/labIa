import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/tipos";

import { BUCKET_FOTOS_TRABAJOS } from "./quitar-fotos";

export { BUCKET_FOTOS_TRABAJOS } from "./quitar-fotos";

/** Vida de cada URL firmada: corta, para que un enlace reenviado no quede abierto (LAB-52). */
export const SEGUNDOS_URL_FOTO_TRABAJO = 600;

/**
 * URLs firmadas de las fotos de un trabajo, generadas con el cliente de la sesión: Storage aplica
 * la política de lectura, así que solo llega una URL a quien puede ver el trabajo. Las rutas que
 * no se pueden firmar (no existen o no se puede leer) se omiten en silencio.
 */
export async function firmarFotosTrabajo(
  supabase: SupabaseClient<Database>,
  rutas: readonly string[],
): Promise<string[]> {
  if (rutas.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOS_TRABAJOS)
    .createSignedUrls([...rutas], SEGUNDOS_URL_FOTO_TRABAJO);
  if (error || !data) return [];
  return data.flatMap((firma) => (firma.error || !firma.signedUrl ? [] : [firma.signedUrl]));
}
