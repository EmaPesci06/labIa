import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

type Admin = SupabaseClient<Database>;

export class ErrorBorrado extends Error {}

const POR_PAGINA = 100;
const MAXIMO_PAGINAS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Borra todos los archivos de una carpeta de un bucket (sin recursión: las carpetas son planas). */
async function vaciarCarpeta(admin: Admin, bucket: string, carpeta: string): Promise<void> {
  const almacen = admin.storage.from(bucket);
  for (let pagina = 0; pagina < MAXIMO_PAGINAS; pagina += 1) {
    const { data, error } = await almacen.list(carpeta, { limit: POR_PAGINA });
    if (error) throw new ErrorBorrado("No pudimos listar los archivos de la cuenta.");
    const archivos = (data ?? []).filter((a) => a.id !== null).map((a) => `${carpeta}/${a.name}`);
    if (archivos.length === 0) return;
    const { error: errorBorrado } = await almacen.remove(archivos);
    if (errorBorrado) throw new ErrorBorrado("No pudimos borrar los archivos de la cuenta.");
    if (archivos.length < POR_PAGINA) return;
  }
}

/**
 * Job de borrado de cuenta (LAB-33, Ley 25.326). Se corre con la service role y SOLO después de
 * haber validado sesión, confirmación y reautenticación de la persona. El cliente con service role
 * se crea acá adentro (LAB-57): quien llama pasa solo el id, nunca la clave.
 *
 * 1. Borra sus archivos: `fotos/perfiles/<uid>`, `fotos/trabajos-hechos/<uid>`, `fotos/trabajos/<id>`
 *    de cada trabajo suyo y `documentos/<uid>`. Si algo falla, corta antes de tocar la cuenta
 *    (se puede reintentar).
 * 2. Borra `auth.users`. La cascada borra `usuarios` y todo lo que cuelga; las reseñas escritas
 *    quedan anónimas y los trabajos asignados a un profesional se cancelan (migración
 *    `borrado_de_cuenta`).
 * 3. Registra en `acciones_moderacion` solo el id y la fecha.
 */
export async function borrarCuentaDeUsuario(uid: string): Promise<void> {
  if (!UUID.test(uid)) throw new ErrorBorrado("Falta el identificador de la cuenta.");
  const admin = crearClienteAdmin();

  const { data: trabajos, error } = await admin.from("trabajos").select("id").eq("cliente_id", uid);
  if (error) throw new ErrorBorrado("No pudimos preparar el borrado de la cuenta.");

  const carpetasFotos = [
    `perfiles/${uid}`,
    `trabajos-hechos/${uid}`,
    ...(trabajos ?? []).map((t) => `trabajos/${t.id}`),
  ];
  for (const carpeta of carpetasFotos) await vaciarCarpeta(admin, "fotos", carpeta);
  await vaciarCarpeta(admin, "documentos", uid);

  const { error: errorUsuario } = await admin.auth.admin.deleteUser(uid);
  if (errorUsuario) throw new ErrorBorrado("No pudimos borrar la cuenta.");

  // Si el registro falla no se deshace nada: la cuenta ya no existe.
  await admin.from("acciones_moderacion").insert({ accion: "cuenta_borrada", objetivo_id: uid });
}
