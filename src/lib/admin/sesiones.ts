import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Cierra las sesiones de una cuenta suspendida (refresh tokens y sesiones de Auth). El SDK de Auth
 * solo cierra sesiones con el JWT del propio usuario, así que se usa la RPC `revocar_sesiones_admin`
 * (solo service_role). Se llama después de suspender_cuenta_admin, tras validar sesión de admin.
 * El JWT de acceso que siga vigente vence solo, pero la cuenta ya no opera: el proxy la manda a
 * /suspendida y las RLS exigen cuenta activa.
 */
export async function revocarSesionesUsuario(usuarioId: string): Promise<boolean> {
  try {
    const { error } = await crearClienteAdmin().rpc("revocar_sesiones_admin", {
      p_usuario_id: usuarioId,
    });
    return !error;
  } catch {
    return false;
  }
}
