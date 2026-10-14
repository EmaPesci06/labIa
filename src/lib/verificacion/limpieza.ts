import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/tipos";

/** Un archivo de `documentos` que sus filas en `verificaciones` ya no necesitan (retención). */
export type FilaRetencion = {
  id: string;
  storage_path: string;
  borrar_despues_de: string | null;
  archivo_borrado_at: string | null;
};

/** Un archivo sin fila en `verificaciones` (subida que no se registró) se borra después de 24 h. */
export const HORAS_HUERFANO = 24;

const BUCKET = "documentos";
const TAMANO_LOTE = 100;

/**
 * Filas cuyo archivo venció: tiene fecha de borrado, la fecha ya pasó y el archivo todavía no se
 * borró. Función pura: el job le pasa la hora para poder probarla con fechas falsas.
 */
export function vencidosParaBorrar(filas: FilaRetencion[], ahora: Date): FilaRetencion[] {
  return filas.filter(
    (f) =>
      f.archivo_borrado_at === null &&
      f.borrar_despues_de !== null &&
      new Date(f.borrar_despues_de).getTime() <= ahora.getTime(),
  );
}

function partir<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

export type ResultadoLimpieza = {
  /** Archivos vencidos borrados (y marcados en la base). */
  borrados: number;
  /** Archivos huérfanos borrados. */
  huerfanos: number;
  /** Archivos que no se pudieron borrar; se reintentan en la próxima corrida. */
  fallidos: number;
};

/**
 * Borra los documentos vencidos y los huérfanos del bucket `documentos`. Solo corre en el servidor
 * con la service role (cron diario, Guía §7.5). Si Storage falla en un lote, ese lote no se marca
 * como borrado y se reintenta en la próxima corrida.
 */
export async function limpiarDocumentos(
  admin: SupabaseClient<Database>,
  ahora: Date = new Date(),
): Promise<ResultadoLimpieza> {
  const { data: filas, error } = await admin
    .from("verificaciones")
    .select("id, storage_path, borrar_despues_de, archivo_borrado_at")
    .is("archivo_borrado_at", null)
    .not("borrar_despues_de", "is", null)
    .lte("borrar_despues_de", ahora.toISOString());
  if (error) throw new Error("No se pudieron leer los documentos vencidos.");

  let borrados = 0;
  let fallidos = 0;
  for (const lote of partir(vencidosParaBorrar(filas ?? [], ahora), TAMANO_LOTE)) {
    const { error: errorStorage } = await admin.storage
      .from(BUCKET)
      .remove(lote.map((f) => f.storage_path));
    if (errorStorage) {
      fallidos += lote.length;
      continue;
    }
    const { error: errorMarca } = await admin
      .from("verificaciones")
      .update({ archivo_borrado_at: ahora.toISOString() })
      .in(
        "id",
        lote.map((f) => f.id),
      );
    if (errorMarca) {
      fallidos += lote.length;
      continue;
    }
    borrados += lote.length;
  }

  let huerfanos = 0;
  const antes = new Date(ahora.getTime() - HORAS_HUERFANO * 3_600_000).toISOString();
  const { data: rutas, error: errorHuerfanos } = await admin.rpc("documentos_huerfanos", {
    p_antes: antes,
  });
  if (errorHuerfanos) throw new Error("No se pudieron listar los archivos huérfanos.");
  for (const lote of partir(rutas ?? [], TAMANO_LOTE)) {
    const { error: errorStorage } = await admin.storage.from(BUCKET).remove(lote);
    if (errorStorage) fallidos += lote.length;
    else huerfanos += lote.length;
  }

  return { borrados, huerfanos, fallidos };
}
