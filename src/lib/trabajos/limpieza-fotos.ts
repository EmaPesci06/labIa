import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

import { BUCKET_FOTOS_TRABAJOS } from "./fotos-firmadas";

const TAMANO_LOTE = 100;

export type ResultadoLimpiezaFotos = {
  /** Trabajos cuyas fotos se quitaron del bucket y se marcaron como limpios en la base. */
  trabajos: number;
  /** Archivos quitados del bucket. */
  fotosBorradas: number;
  /** Trabajos que no se pudieron limpiar; se reintentan en la próxima ejecución. */
  fallidos: number;
};

/**
 * Job diario (LAB-52): quita del bucket privado `fotos-trabajos` las fotos de los trabajos cuyo
 * borrado ya venció. La fecha la fija el trigger de `trabajos` (cancelado o cerrado: al momento;
 * terminado: 30 días). Cancelar o cerrar ya intenta quitar las fotos de inmediato; este job cubre
 * lo que quedó pendiente. Corre con la service role, solo desde la ruta protegida con `CRON_SECRET`.
 */
export async function limpiarFotosTrabajos(
  admin: SupabaseClient<Database> = crearClienteAdmin(),
  ahora: Date = new Date(),
): Promise<ResultadoLimpiezaFotos> {
  const { data: filas, error } = await admin
    .from("trabajos")
    .select("id, fotos")
    .not("fotos_borrar_despues_de", "is", null)
    .lte("fotos_borrar_despues_de", ahora.toISOString())
    .limit(TAMANO_LOTE);

  if (error) throw new Error("No se pudieron leer los trabajos para limpiar sus fotos.");

  let trabajos = 0;
  let fotosBorradas = 0;
  let fallidos = 0;

  for (const fila of filas ?? []) {
    const rutas = fila.fotos ?? [];
    if (rutas.length > 0) {
      const { error: errorStorage } = await admin.storage.from(BUCKET_FOTOS_TRABAJOS).remove(rutas);
      if (errorStorage) {
        fallidos += 1;
        continue;
      }
      fotosBorradas += rutas.length;
    }

    const { error: errorMarca } = await admin
      .from("trabajos")
      .update({ fotos: [], fotos_borrar_despues_de: null })
      .eq("id", fila.id);
    if (errorMarca) {
      fallidos += 1;
      continue;
    }
    trabajos += 1;
  }

  return { trabajos, fotosBorradas, fallidos };
}
