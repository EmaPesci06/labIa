import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

/** Bucket privado de almacenamiento para documentos de identidad y matrículas. */
export const BUCKET_DOCUMENTOS = "documentos";

/** Días de retención para documentos revisados (promesa de la Política de Privacidad). */
export const DIAS_RETENCION = 30;

/** Un archivo sin fila en `verificaciones` (subida no registrada) se borra después de 24 h. */
export const HORAS_HUERFANO = 24;

const TAMANO_LOTE = 100;

/** Registro de verificación para evaluar retención y purga de Storage. */
export type FilaRetencion = {
  id: string;
  storage_path: string;
  estado?: Database["public"]["Enums"]["estado_verificacion"] | null;
  revisado_at?: string | null;
  borrar_despues_de?: string | null;
  archivo_borrado_at?: string | null;
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
 * Filas cuyo archivo venció y debe ser eliminado del bucket `documentos`:
 * - El archivo no ha sido purgado (`archivo_borrado_at === null`).
 * - No está pendiente de revisión (a menos que tenga fecha explícita programada).
 * - Si tiene `borrar_despues_de` programado, la fecha ya pasó.
 * - Si no tiene `borrar_despues_de` pero sí `revisado_at`, pasaron al menos 30 días de revisado.
 */
export function vencidosParaBorrar(
  filas: FilaRetencion[],
  ahora: Date = new Date(),
): FilaRetencion[] {
  const limite30Dias = ahora.getTime() - DIAS_RETENCION * 24 * 60 * 60 * 1000;
  return filas.filter((f) => {
    if (f.archivo_borrado_at !== null && f.archivo_borrado_at !== undefined) return false;
    if (f.estado === "pendiente" && !f.borrar_despues_de) return false;

    if (f.borrar_despues_de !== null && f.borrar_despues_de !== undefined) {
      return new Date(f.borrar_despues_de).getTime() <= ahora.getTime();
    }

    if (f.revisado_at !== null && f.revisado_at !== undefined) {
      return new Date(f.revisado_at).getTime() <= limite30Dias;
    }

    return false;
  });
}

function partir<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

/**
 * Elimina de Storage los archivos de verificación con más de 30 días de revisados (o vencidos)
 * y los archivos huérfanos de más de 24 horas.
 *
 * Conserva el registro en la tabla `verificaciones` con su resultado/estado ('aprobada' / 'rechazada')
 * e insignias en el perfil, pero marca que el documento fue eliminado seteando `archivo_borrado_at`.
 */
export async function borrarDocumentosVencidos(
  clienteAdmin: SupabaseClient<Database> = crearClienteAdmin(),
  ahora: Date = new Date(),
): Promise<ResultadoLimpieza> {
  const { data: filas, error } = await clienteAdmin
    .from("verificaciones")
    .select("id, storage_path, estado, revisado_at, borrar_despues_de, archivo_borrado_at")
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

  let huerfanos = 0;
  const antes = new Date(ahora.getTime() - HORAS_HUERFANO * 3_600_000).toISOString();
  try {
    const { data: rutasHuerfanas, error: errorHuerfanos } = await clienteAdmin.rpc(
      "documentos_huerfanos",
      { p_antes: antes },
    );

    if (!errorHuerfanos && rutasHuerfanas && rutasHuerfanas.length > 0) {
      for (const lote of partir(rutasHuerfanas, TAMANO_LOTE)) {
        const { error: errorStorage } = await clienteAdmin.storage
          .from(BUCKET_DOCUMENTOS)
          .remove(lote);

        if (errorStorage) {
          fallidos += lote.length;
        } else {
          huerfanos += lote.length;
        }
      }
    }
  } catch {
    // Si la función de huérfanos falla o no está definida, no aborta el resultado de los vencidos.
  }

  return { borrados, huerfanos, fallidos };
}

/** Alias para compatibilidad con código existente */
export const limpiarDocumentos = borrarDocumentosVencidos;
