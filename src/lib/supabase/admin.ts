import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./tipos";

/** Duración de las URLs firmadas de documentos (Guía §7.2). */
export const SEGUNDOS_URL_DOCUMENTO = 60;

const BUCKET_DOCUMENTOS = "documentos";

// <usuario_id>/<tipo>-<timestamp>.<ext>, igual que la política de Storage.
const RUTA_DOCUMENTO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(dni_frente|dni_dorso|antecedentes|matricula)-[0-9]+\.(jpg|jpeg|png|pdf)$/;

export class ErrorDocumento extends Error {}

/**
 * Cliente con la service role: saltea RLS. Solo servidor, solo código de `/admin` y jobs
 * (Guía §7.5). Nunca lo importes desde un componente de cliente.
 */
export function crearClienteAdmin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    throw new ErrorDocumento("Falta configurar Supabase para el servidor.");
  }
  return createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Id del admin de la sesión (cliente con la clave anon y las cookies del usuario), o `null` si la
 * sesión no es de un admin activo.
 */
async function idDeAdminDeLaSesion(sesion: SupabaseClient<Database>): Promise<string | null> {
  const { data: auth } = await sesion.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sesion
    .from("usuarios")
    .select("rol, estado")
    .eq("id", auth.user.id)
    .maybeSingle();
  return data?.rol === "admin" && data.estado === "activa" ? auth.user.id : null;
}

/**
 * URL firmada de 60 segundos para ver un documento del bucket privado `documentos`.
 *
 * Solo la puede pedir un admin: `sesion` es el cliente de la sesión actual (el de `@supabase/ssr`,
 * no el de la service role) y se verifica que su rol sea `admin` antes de firmar. La ruta tiene
 * que tener la forma `<usuario_id>/<tipo>-<timestamp>.<ext>`.
 *
 * Cada firma queda en `accesos_documentos` (quién y qué archivo). Si no se puede registrar el
 * acceso, no se firma: falla cerrado.
 */
export async function firmarDocumento(
  path: string,
  sesion: SupabaseClient<Database>,
  clienteAdmin: SupabaseClient<Database> = crearClienteAdmin(),
): Promise<string> {
  if (!RUTA_DOCUMENTO.test(path)) {
    throw new ErrorDocumento("La ruta del documento no es válida.");
  }
  const adminId = await idDeAdminDeLaSesion(sesion);
  if (!adminId) {
    throw new ErrorDocumento("Solo un admin puede ver documentos.");
  }
  const { error: errorAuditoria } = await clienteAdmin
    .from("accesos_documentos")
    .insert({ admin_id: adminId, storage_path: path });
  if (errorAuditoria) {
    throw new ErrorDocumento("No se pudo registrar el acceso al documento.");
  }
  const { data, error } = await clienteAdmin.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, SEGUNDOS_URL_DOCUMENTO);
  if (error || !data) {
    throw new ErrorDocumento("No se pudo generar el enlace del documento.");
  }
  return data.signedUrl;
}
