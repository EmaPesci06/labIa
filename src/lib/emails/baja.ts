import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";

import { verificarTokenBaja, type CategoriaBaja } from "./token";

export type ResultadoBaja =
  { ok: true; categoria: CategoriaBaja } | { ok: false; motivo: "invalido" | "error" };

/**
 * Baja desde el link de un email, sin sesión: la autoriza la firma del token. Apaga solo la
 * preferencia de la categoría del token y deja la otra como estaba.
 */
export async function aplicarBaja(token: string | null | undefined): Promise<ResultadoBaja> {
  const secreto = process.env.EMAILS_SECRET;
  if (!token || !secreto) return { ok: false, motivo: "invalido" };
  const carga = verificarTokenBaja(token, secreto);
  if (!carga) return { ok: false, motivo: "invalido" };

  try {
    const admin = crearClienteAdmin();
    const { error } = await admin
      .from("preferencias_email")
      .upsert(
        carga.categoria === "trabajos_cerca"
          ? { usuario_id: carga.usuarioId, trabajos_cerca: false }
          : { usuario_id: carga.usuarioId, novedades: false },
        { onConflict: "usuario_id" },
      );
    if (error) return { ok: false, motivo: "error" };
    return { ok: true, categoria: carga.categoria };
  } catch {
    return { ok: false, motivo: "error" };
  }
}
