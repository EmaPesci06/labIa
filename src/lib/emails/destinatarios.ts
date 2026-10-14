import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/tipos";

import { enviarEmail, type ResultadoEnvio } from "./enviar";
import { definicion, type DatosPlantillas, type Plantilla } from "./plantillas";

export type ClienteAdmin = SupabaseClient<Database>;

export type Destinatario = {
  id: string;
  email: string;
  nombre: string;
  /** "Nombre Apellido": para mostrarlo a otros usuarios (nunca teléfono ni dirección). */
  nombreCompleto: string;
  estado: "activa" | "suspendida";
};

/** Email (de Auth) y nombre de un usuario, o `null` si no existe. */
export async function buscarDestinatario(
  admin: ClienteAdmin,
  usuarioId: string,
): Promise<Destinatario | null> {
  const [{ data: cuenta }, { data: fila }] = await Promise.all([
    admin.auth.admin.getUserById(usuarioId),
    admin.from("usuarios").select("nombre, apellido, estado").eq("id", usuarioId).maybeSingle(),
  ]);
  const email = cuenta.user?.email;
  if (!email || !fila) return null;
  const nombre = fila.nombre?.trim() || email.split("@")[0] || "";
  const nombreCompleto = [fila.nombre, fila.apellido].filter(Boolean).join(" ").trim() || nombre;
  return { id: usuarioId, email, nombre, nombreCompleto, estado: fila.estado };
}

/** ¿El usuario quiere recibir este tipo de email? Sin fila de preferencias, todo está activo. */
export async function quiereRecibir(
  admin: ClienteAdmin,
  usuarioId: string,
  preferencia: "trabajos_cerca" | "novedades" | null,
): Promise<boolean> {
  if (!preferencia) return true;
  const { data } = await admin
    .from("preferencias_email")
    .select("trabajos_cerca, novedades")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data ? data[preferencia] : true;
}

/**
 * Manda una plantilla a un usuario por su id: busca su email, respeta sus preferencias y no manda
 * a cuentas suspendidas. `datos` se arma con el destinatario ya resuelto.
 */
export async function enviarAUsuario<K extends Plantilla>(
  admin: ClienteAdmin,
  usuarioId: string,
  plantilla: K,
  datos: (destinatario: Destinatario) => DatosPlantillas[K],
): Promise<ResultadoEnvio> {
  const destinatario = await buscarDestinatario(admin, usuarioId);
  if (!destinatario || destinatario.estado !== "activa") return { estado: "omitido" };
  if (!(await quiereRecibir(admin, usuarioId, definicion(plantilla).preferencia))) {
    return { estado: "omitido" };
  }
  return enviarEmail({
    para: destinatario.email,
    usuarioId,
    plantilla,
    datos: datos(destinatario),
  });
}
