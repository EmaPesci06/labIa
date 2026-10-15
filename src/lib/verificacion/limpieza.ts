import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

/** Bucket privado de almacenamiento para documentos de identidad y matrículas. */
export const BUCKET_DOCUMENTOS = "documentos";

/** Días de retención para documentos decididos (promesa de la Política de Privacidad). */
export const DIAS_RETENCION = 30;

/** Un archivo sin fila en `verificaciones` (subida no registrada) se borra después de 24 h. */
export const HORAS_HUERFANO = 24;

const TAMANO_LOTE = 100;

/**
 * Registro de verificación para evaluar la purga de Storage. La base fija `borrar_despues_de`
 * al decidir (trigger `verificaciones_programar_borrado`: 30 días, o 1 día si fue reemplazado).
 */
export type FilaRetencion = {
  id: string;
  storage_path: string;
  borrar_despues_de: string | null;
  archivo_borrado_at: string | null;
};

export type ResultadoLimpieza = {
  /** Archivos vencidos borrados del bucket y marcados en la base. */
  borrados: number;
  /** Archivos huérfanos borrados del bucket. */
  huerfanos: number;
  /** Archivos que no se pudieron borrar; se reintentan en la próxima ejecución. */
  fallidos: number;
};

/**
 * Filas cuya fecha de borrado ya pasó y cuyo archivo todavía no fue purgado.
 * Un documento sin `borrar_despues_de` no se borra.
 */
export function vencidosParaBorrar(
  filas: FilaRetencion[],
  ahora: Date = new Date(),
): FilaRetencion[] {
  return filas.filter((f) => {
    if (f.archivo_borrado_at) return false;
    if (!f.borrar_despues_de) return false;
    return new Date(f.borrar_despues_de).getTime() <= ahora.getTime();
  });
}

function partir<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

/**
 * Elimina de Storage los archivos de verificación vencidos y los huérfanos de más de 24 horas.
 * Conserva el registro en `verificaciones` (estado e insignias) y marca `archivo_borrado_at`.
 * Si no se pueden listar los huérfanos, el error se propaga (la ruta responde 500).
 */
export async function limpiarDocumentos(
  clienteAdmin: SupabaseClient<Database> = crearClienteAdmin(),
  ahora: Date = new Date(),
): Promise<ResultadoLimpieza> {
  const { data: filas, error } = await clienteAdmin
    .from("verificaciones")
    .select("id, storage_path, borrar_despues_de, archivo_borrado_at")
    .is("archivo_borrado_at", null)
    .not("borrar_despues_de", "is", null)
    .lte("borrar_despues_de", ahora.toISOString());

  if (error) {
    throw new Error("No se pudieron leer las verificaciones para limpieza.");
  }

  const candidatos = vencidosParaBorrar(filas ?? [], ahora);

  let borrados = 0;
  let fallidos = 0;

  for (const lote of partir(candidatos, TAMANO_LOTE)) {
    const rutas = lote.map((f) => f.storage_path).filter(Boolean);
    if (rutas.length > 0) {
      const { error: errorStorage } = await clienteAdmin.storage
        .from(BUCKET_DOCUMENTOS)
        .remove(rutas);

      if (errorStorage) {
        fallidos += lote.length;
        continue;
      }
    }

    const { error: errorMarca } = await clienteAdmin
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

  const antes = new Date(ahora.getTime() - HORAS_HUERFANO * 3_600_000).toISOString();
  const { data: rutasHuerfanas, error: errorHuerfanos } = await clienteAdmin.rpc(
    "documentos_huerfanos",
    { p_antes: antes },
  );
  if (errorHuerfanos) {
    throw new Error("No se pudieron listar los archivos huérfanos.");
  }

  let huerfanos = 0;
  for (const lote of partir(rutasHuerfanas ?? [], TAMANO_LOTE)) {
    const { error: errorStorage } = await clienteAdmin.storage.from(BUCKET_DOCUMENTOS).remove(lote);
    if (errorStorage) {
      fallidos += lote.length;
    } else {
      huerfanos += lote.length;
    }
  }

  return { borrados, huerfanos, fallidos };
}
