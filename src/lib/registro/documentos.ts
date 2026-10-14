"use server";

import { headers } from "next/headers";

import { limitarIntentos } from "@/lib/rate-limit";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import {
  esquemaDocumento,
  esRutaDocumento,
  type EntradaDocumento,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";

import type { ItemVerificacion } from "./tipos";

const REGLA_DOCUMENTO = { maximo: 15, ventanaMs: 60_000 } as const;

async function ipDelPedido(): Promise<string> {
  const encabezados = await headers();
  const reenviado = encabezados.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviado || encabezados.get("x-real-ip") || "desconocida";
}

function mensajeDeError(codigo: string | undefined): string {
  // 42501 también sale cuando falta el consentimiento vigente (LAB-43): el mensaje cubre los dos casos.
  if (codigo === "42501")
    return "No podés cargar documentos ahora. Revisá el consentimiento de datos y recargá la página.";
  if (codigo === "23514") return "No encontramos el archivo subido. Probá de nuevo.";
  if (codigo === "23505") return "Ese documento ya estaba registrado.";
  return "No pudimos registrar el documento. Probá de nuevo.";
}

/**
 * Consulta las verificaciones registradas del usuario autenticado.
 * Usa la vista `mis_verificaciones` que no expone `storage_path`.
 */
export async function obtenerMisVerificaciones(): Promise<ItemVerificacion[]> {
  if (!supabaseConfigurado()) return [];
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("mis_verificaciones")
    .select("id, tipo, estado, motivo_rechazo, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter(
      (
        fila,
      ): fila is {
        id: string;
        tipo: TipoDocumento;
        estado: "pendiente" | "aprobado" | "rechazado";
        motivo_rechazo: string | null;
        created_at: string;
      } =>
        typeof fila.id === "string" &&
        fila.tipo !== null &&
        fila.estado !== null &&
        typeof fila.created_at === "string",
    )
    .map((fila) => ({
      id: fila.id,
      tipo: fila.tipo,
      estado: fila.estado,
      motivoRechazo: fila.motivo_rechazo,
      createdAt: fila.created_at,
    }));
}

/**
 * Registra en la base de datos un documento previamente subido a Supabase Storage.
 * Valida sesión activa, rol profesional, formato de ruta y llama a la RPC `registrar_documento`.
 */
export async function registrarDocumentoAccion(
  entrada: EntradaDocumento,
): Promise<{ ok: boolean; id?: string; mensaje?: string }> {
  const parseo = esquemaDocumento.safeParse(entrada);
  if (!parseo.success) {
    return { ok: false, mensaje: "Datos de documento inválidos." };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "El servicio no está disponible temporalmente." };
  }

  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, mensaje: "Necesitás iniciar sesión para registrar documentos." };
  }
  const uid = auth.user.id;

  const resultadoLimite = limitarIntentos(`doc:${await ipDelPedido()}`, REGLA_DOCUMENTO);
  if (!resultadoLimite.permitido) {
    return {
      ok: false,
      mensaje: `Demasiados intentos. Esperá ${resultadoLimite.segundosParaReintentar} segundos.`,
    };
  }

  if (!esRutaDocumento(entrada.storagePath, uid, entrada.tipo)) {
    return { ok: false, mensaje: "La ruta del archivo no es válida para tu cuenta." };
  }

  const { data, error } = await supabase.rpc("registrar_documento", {
    p_tipo: entrada.tipo,
    p_storage_path: entrada.storagePath,
  });

  if (error) {
    // Mensajes fijos: el texto de Postgres no se muestra.
    return { ok: false, mensaje: mensajeDeError(error.code) };
  }

  return { ok: true, id: data ?? undefined };
}
