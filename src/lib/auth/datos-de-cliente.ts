import "server-only";

import type { crearClienteServidor } from "@/lib/supabase/servidor";

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>;

/**
 * Guarda los datos de contacto del cliente que ya tiene sesión. El WhatsApp solo se puede
 * escribir por la función `actualizar_whatsapp` (la columna no es editable a mano, LAB-12) y el
 * barrio por un UPDATE normal, que la RLS limita a la fila propia. Devuelve `false` si algo falla.
 */
export async function guardarDatosDeCliente(
  supabase: Supabase,
  idUsuario: string,
  datos: { whatsapp: string; barrioId: number; nombre?: string; apellido?: string | null },
): Promise<boolean> {
  const { error: errorWhatsapp } = await supabase.rpc("actualizar_whatsapp", {
    p_whatsapp: datos.whatsapp,
  });
  if (errorWhatsapp) return false;

  const cambios: { barrio_id: number; nombre?: string; apellido?: string | null } = {
    barrio_id: datos.barrioId,
  };
  if (datos.nombre) cambios.nombre = datos.nombre;
  if (datos.apellido !== undefined) cambios.apellido = datos.apellido;

  const { error } = await supabase.from("usuarios").update(cambios).eq("id", idUsuario);
  return !error;
}
