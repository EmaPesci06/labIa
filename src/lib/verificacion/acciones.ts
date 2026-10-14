"use server";

import { revalidatePath } from "next/cache";

import { sesionAdmin } from "@/lib/admin/sesion";
import type { EstadoFormulario } from "@/lib/auth/estado";
import { avisarDocumentoRechazado, avisarPerfilPublicado } from "@/lib/emails/avisos";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { ErrorDocumento, firmarDocumento, SEGUNDOS_URL_DOCUMENTO } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import {
  esquemaDecision,
  esquemaVerificacionId,
  textoDelRechazo,
} from "@/lib/validaciones/verificacion";

import { formatoVisible } from "./logica";

export type ResultadoVisor =
  | { ok: true; url: string; formato: "imagen" | "pdf"; expiraEn: string }
  | { ok: false; mensaje: string };

const SIN_PERMISO = "Solo un admin puede revisar documentos.";

/** Primeros bytes de un cuerpo de respuesta (para mirar la cabecera del archivo sin bajarlo entero). */
async function leerInicio(cuerpo: ReadableStream<Uint8Array>, bytes: number): Promise<Uint8Array> {
  const lector = cuerpo.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < bytes) {
      const { done, value } = await lector.read();
      if (done || !value) break;
      partes.push(value);
      total += value.length;
    }
  } finally {
    void lector.cancel().catch(() => undefined);
  }
  const unido = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    unido.set(parte, posicion);
    posicion += parte.length;
  }
  return unido.slice(0, bytes);
}

/**
 * Pide al bucket los primeros 16 bytes del archivo (Range) y comprueba que sean JPEG, PNG o PDF y
 * que coincidan con la extensión declarada. Si no, no se muestra el archivo.
 */
async function formatoDelArchivo(url: string, ruta: string): Promise<"imagen" | "pdf" | null> {
  const respuesta = await fetch(url, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
  if (!respuesta.ok || !respuesta.body) return null;
  const cabecera = await leerInicio(respuesta.body, 16);
  return formatoVisible(cabecera, ruta);
}

/**
 * URL firmada de 60 s para ver un documento, pedida al abrir el visor (no en el HTML inicial).
 * Valida sesión y rol admin, y el contenido real del archivo antes de devolver la URL.
 */
export async function pedirVisorDocumento(verificacionId: string): Promise<ResultadoVisor> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, mensaje: SIN_PERMISO };

  const parseo = esquemaVerificacionId.safeParse({ verificacionId });
  if (!parseo.success) return { ok: false, mensaje: "La verificación no es válida." };

  const cliente = await crearClienteServidor();
  const { data: fila } = await cliente
    .from("verificaciones")
    .select("storage_path, archivo_borrado_at")
    .eq("id", parseo.data.verificacionId)
    .maybeSingle();
  if (!fila) return { ok: false, mensaje: "No encontramos ese documento." };
  if (fila.archivo_borrado_at) {
    return { ok: false, mensaje: "El archivo ya se borró por la política de retención." };
  }

  let url: string;
  try {
    url = await firmarDocumento(fila.storage_path, cliente);
  } catch (error) {
    return {
      ok: false,
      mensaje: error instanceof ErrorDocumento ? error.message : "No pudimos abrir el documento.",
    };
  }

  const formato = await formatoDelArchivo(url, fila.storage_path);
  if (!formato) {
    return {
      ok: false,
      mensaje: "El archivo no es una imagen JPG o PNG ni un PDF válido, así que no lo mostramos.",
    };
  }
  return {
    ok: true,
    url,
    formato,
    expiraEn: new Date(Date.now() + SEGUNDOS_URL_DOCUMENTO * 1000).toISOString(),
  };
}

function mensajeDeDecision(codigo: string | undefined): string {
  if (codigo === "42501") return SIN_PERMISO;
  if (codigo === "P0002") return "No encontramos esa verificación.";
  return "No se pudo guardar la decisión. Revisá que el documento siga pendiente.";
}

/**
 * Aprueba o rechaza un documento pendiente (LAB-21). La base decide y recalcula las insignias
 * (`decidir_documento`); acá se avisa por email y, si el perfil recién quedó publicado, se manda el
 * evento. Los avisos nunca lanzan: un fallo de email no deshace la decisión.
 */
export async function decidirVerificacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await sesionAdmin();
  if (!sesion) return { mensaje: SIN_PERMISO };

  const texto = (campo: string) => {
    const valor = datos.get(campo);
    return typeof valor === "string" && valor !== "" ? valor : undefined;
  };
  const parseo = esquemaDecision.safeParse({
    verificacionId: texto("verificacionId"),
    accion: texto("accion"),
    motivo: texto("motivo"),
    detalle: texto("detalle"),
  });
  if (!parseo.success) {
    return {
      errores: erroresPorCampo(parseo.error),
      mensaje: "Revisá los datos marcados en el formulario.",
    };
  }
  const { verificacionId, accion, motivo, detalle } = parseo.data;
  const aprobar = accion === "aprobar";

  const cliente = await crearClienteServidor();
  const { data: fila } = await cliente
    .from("verificaciones")
    .select("usuario_id")
    .eq("id", verificacionId)
    .maybeSingle();
  if (!fila) return { mensaje: "No encontramos esa verificación." };

  const { data: antes } = await cliente
    .from("perfiles_profesionales")
    .select("publicado")
    .eq("usuario_id", fila.usuario_id)
    .maybeSingle();

  const { data, error } = await cliente.rpc("decidir_documento", {
    p_verificacion: verificacionId,
    p_aprobar: aprobar,
    p_motivo: aprobar ? undefined : motivo,
    p_detalle: aprobar ? undefined : detalle,
  });
  if (error) return { mensaje: mensajeDeDecision(error.code) };
  const decision = data?.[0];
  if (!decision) return { mensaje: "No pudimos guardar la decisión. Probá de nuevo." };

  const usuarioId = decision.r_usuario_id;
  const { data: despues } = await cliente
    .from("perfiles_profesionales")
    .select("publicado")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const recienPublicado = !antes?.publicado && despues?.publicado === true;

  if (recienPublicado) {
    await avisarPerfilPublicado(usuarioId);
    await registrarEventoServidor(usuarioId, "profesional_verificado");
  }
  if (!aprobar && motivo) {
    await avisarDocumentoRechazado(usuarioId, decision.r_tipo, textoDelRechazo(motivo, detalle));
  }

  revalidatePath("/admin/verificaciones");
  revalidatePath(`/admin/verificaciones/${usuarioId}`);

  if (!aprobar) return { exito: "Documento rechazado. Le avisamos por email." };
  return {
    exito: recienPublicado
      ? "Documento aprobado. El perfil ya está publicado."
      : "Documento aprobado.",
  };
}
