import { darConsentimientoDatosSensibles } from "@/lib/legales-acciones";
import { VERSION_LEGALES } from "@/lib/legales";
import { comprimirImagen } from "@/lib/imagen";
import { registrarDocumentoAccion } from "@/lib/registro/documentos";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { MENSAJE_CONSENTIMIENTO } from "@/lib/validaciones/consentimiento";
import {
  extensionDe,
  generarRutaDocumento,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";

export type ResultadoSubida =
  { ok: true; subidos: TipoDocumento[] } | { ok: false; subidos: TipoDocumento[]; mensaje: string };

/** Las fotos se comprimen a JPEG (máx. 1600 px, calidad 0,8); los PDF se suben tal cual. */
async function prepararArchivo(
  archivo: File,
): Promise<{ cuerpo: Blob; extension: string; contentType: string }> {
  if (archivo.type === "application/pdf") {
    return { cuerpo: archivo, extension: "pdf", contentType: "application/pdf" };
  }
  const cuerpo = await comprimirImagen(archivo);
  return { cuerpo, extension: "jpg", contentType: "image/jpeg" };
}

/**
 * Sube los documentos al bucket privado `documentos` (ruta `<uid>/<tipo>-<timestamp>.<ext>`, sin el
 * nombre original) y los registra. Se detiene en el primer error y devuelve lo que sí quedó subido,
 * así un reintento no repite trabajo.
 *
 * `consentido` es el estado real de la casilla de datos sensibles (LAB-43). Sin tildar, no se llama
 * a la acción de consentimiento ni se sube nada.
 */
export async function subirDocumentos(
  uid: string,
  entradas: [TipoDocumento, File][],
  alProgreso: (hechos: number, total: number) => void,
  consentido: boolean,
): Promise<ResultadoSubida> {
  const subidos: TipoDocumento[] = [];
  if (entradas.length === 0) return { ok: true, subidos };
  if (!consentido) return { ok: false, subidos, mensaje: MENSAJE_CONSENTIMIENTO };

  // Consentimiento expreso antes del primer archivo: la acción lo guarda en el servidor, que después
  // lo exige en la política de Storage y en la RPC.
  const consentimiento = new FormData();
  consentimiento.set("consiento", "on");
  consentimiento.set("version", VERSION_LEGALES);
  const registrado = await darConsentimientoDatosSensibles({}, consentimiento);
  if (registrado.mensaje) return { ok: false, subidos, mensaje: registrado.mensaje };

  const almacen = crearClienteNavegador().storage.from("documentos");
  alProgreso(0, entradas.length);

  for (const [tipo, archivo] of entradas) {
    let preparado;
    try {
      preparado = await prepararArchivo(archivo);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No pudimos leer ese archivo.";
      return { ok: false, subidos, mensaje };
    }
    const ruta = generarRutaDocumento(uid, tipo, preparado.extension || extensionDe(archivo.name));
    const { error } = await almacen.upload(ruta, preparado.cuerpo, {
      contentType: preparado.contentType,
    });
    if (error) {
      return {
        ok: false,
        subidos,
        mensaje:
          "No pudimos subir los documentos. Revisá tu conexión y tocá de nuevo para reintentar.",
      };
    }
    const registro = await registrarDocumentoAccion({ tipo, storagePath: ruta });
    if (!registro.ok) {
      return {
        ok: false,
        subidos,
        mensaje: registro.mensaje ?? "No pudimos registrar los documentos. Probá de nuevo.",
      };
    }
    subidos.push(tipo);
    alProgreso(subidos.length, entradas.length);
  }
  return { ok: true, subidos };
}
