"use server";

import { redirect } from "next/navigation";

import type { EstadoFormulario } from "@/lib/auth/estado";
import { limitarIntentos } from "@/lib/rate-limit";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { preferenciasDeFormulario } from "@/lib/validaciones/emails";

import { aplicarBaja } from "./baja";

/** Guarda los interruptores de `/cuenta/emails`. La RLS deja escribir solo la fila propia. */
export async function guardarPreferenciasEmail(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  if (!supabaseConfigurado()) {
    return { mensaje: "No pudimos guardar tus preferencias. Probá de nuevo más tarde." };
  }
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { mensaje: "Ingresá de nuevo para cambiar tus preferencias." };

  const limite = limitarIntentos(`preferencias-email:${data.user.id}`, {
    maximo: 20,
    ventanaMs: 60_000,
  });
  if (!limite.permitido) {
    return { mensaje: `Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.` };
  }

  const preferencias = preferenciasDeFormulario(datos);
  const { error } = await supabase
    .from("preferencias_email")
    .upsert({ usuario_id: data.user.id, ...preferencias }, { onConflict: "usuario_id" });
  if (error) {
    return { mensaje: "No pudimos guardar tus preferencias. Probá de nuevo en unos minutos." };
  }
  return { exito: "Listo, guardamos tus preferencias." };
}

/** Confirma la baja de la página `/baja` (sin sesión: autoriza la firma del token). */
export async function confirmarBaja(datos: FormData): Promise<void> {
  const token = datos.get("t");
  const resultado = await aplicarBaja(typeof token === "string" ? token : null);
  if (!resultado.ok) redirect(`/baja?error=${resultado.motivo}`);
  redirect(`/baja?listo=${resultado.categoria}`);
}
