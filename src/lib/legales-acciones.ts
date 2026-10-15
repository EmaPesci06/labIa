"use server";

import type { EstadoFormulario } from "@/lib/auth/estado";
import { ipDelPedido } from "@/lib/ip-del-pedido";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { rolDeLaSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { VERSION_LEGALES } from "@/lib/legales";
import {
  esquemaConsentimientoDatosSensibles,
  leerConsentimiento,
} from "@/lib/validaciones/consentimiento";

const REGLA = { maximo: 10, ventanaMs: 60_000 } as const;

/**
 * Guarda el consentimiento expreso para tratar DNI y antecedentes (RPC
 * `aceptar_consentimiento_datos_sensibles`: versión y fecha no se escriben directo). Valida
 * entrada, sesión y rol. Devuelve `exito` para que la carga de documentos siga. La llama
 * `subirDocumentos` antes del primer archivo (LAB-43).
 */
export async function darConsentimientoDatosSensibles(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaConsentimientoDatosSensibles.safeParse(leerConsentimiento(datos));
  if (!resultado.success) {
    return { mensaje: resultado.error.issues[0]?.message ?? "Revisá los datos." };
  }

  if (!supabaseConfigurado()) {
    return { mensaje: "Esto todavía no está disponible. Probá de nuevo más tarde." };
  }
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { mensaje: "Tu sesión venció. Ingresá de nuevo." };

  const ip = await ipDelPedido();
  const limite = await limitarPersistente(`consentimiento:${auth.user.id}:${ip}`, REGLA);
  if (!limite.permitido) {
    return {
      mensaje: `Hiciste demasiados intentos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
    };
  }

  if ((await rolDeLaSesion(supabase, auth.user.id)) !== "profesional") {
    return { mensaje: "Esta cuenta no es de profesional." };
  }

  const { error } = await supabase.rpc("aceptar_consentimiento_datos_sensibles", {
    p_version: VERSION_LEGALES,
  });
  if (error)
    return { mensaje: "No pudimos guardar tu consentimiento. Probá de nuevo en un momento." };
  return { exito: "Guardamos tu consentimiento." };
}
