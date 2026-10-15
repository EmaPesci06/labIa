"use server";

import { obtenerPerfil } from "@/lib/perfil/cargar";
import { profesionPrincipal } from "@/lib/perfil/datos";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { datosDeFormularioContacto, esquemaContacto } from "@/lib/validaciones/contacto";
import { linkWhatsApp } from "@/lib/whatsapp";

import { armarMensajeContacto } from "./mensaje";
import type { EstadoContacto } from "./estado";

const MENSAJE_FALLA = "No pudimos abrir WhatsApp. Probá de nuevo en unos minutos.";

/** Mensaje en castellano para cada error que devuelve `public.contactar_profesional` (LAB-25). */
function mensajeDeError(codigo: string | undefined): string {
  switch (codigo) {
    case "53400":
      return "Llegaste al máximo de contactos por hoy. Probá mañana.";
    case "P0002":
      return "Ese profesional ya no está disponible.";
    case "42501":
      return "No podemos abrir este contacto desde tu cuenta.";
    case "23514":
      return "No pudimos abrir el contacto. Volvé a intentar desde el perfil.";
    default:
      return MENSAJE_FALLA;
  }
}

/**
 * "Abrir WhatsApp" de la hoja "Antes de contactar" (LAB-25). Valida sesión, rol, entrada y el
 * límite de intentos; después la función `contactar_profesional` registra el contacto y devuelve el
 * número. El número solo viaja en la respuesta de esta acción: nunca en el HTML del perfil.
 */
export async function contactarProfesional(
  _anterior: EstadoContacto,
  datos: FormData,
): Promise<EstadoContacto> {
  const sesion = await obtenerSesion();
  if (!sesion) return { mensaje: "Tu sesión venció. Ingresá de nuevo para contactar." };
  if (sesion.rol !== "cliente") {
    return { mensaje: "Solo las cuentas de cliente pueden contactar profesionales." };
  }

  const entrada = esquemaContacto.safeParse(datosDeFormularioContacto(datos));
  if (!entrada.success) return { mensaje: mensajeDeError("23514") };

  const limite = await limitarPersistente(`contacto:${sesion.usuario.id}`, {
    maximo: 10,
    ventanaMs: 60_000,
  });
  if (!limite.permitido) {
    return {
      mensaje: `Hiciste demasiados intentos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
    };
  }

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_FALLA };

  const { profesionalId, origen, trabajoId } = entrada.data;
  try {
    const supabase = await crearClienteServidor();

    const perfil = await obtenerPerfil(supabase, profesionalId);
    if (!perfil) return { mensaje: mensajeDeError("P0002") };

    // Barrio del cliente para el mensaje: solo el nombre del centro de barrio, nunca una dirección.
    const { data: yo } = await supabase
      .from("usuarios")
      .select("barrio_id")
      .eq("id", sesion.usuario.id)
      .maybeSingle();
    let barrioCliente: string | null = null;
    if (yo?.barrio_id) {
      const { data: barrio } = await supabase
        .from("barrios")
        .select("nombre")
        .eq("id", yo.barrio_id)
        .maybeSingle();
      barrioCliente = barrio?.nombre ?? null;
    }

    let tituloTrabajo: string | undefined;
    if (origen === "postulacion" && trabajoId) {
      const { data: trabajo } = await supabase
        .from("trabajos")
        .select("titulo")
        .eq("id", trabajoId)
        .maybeSingle();
      tituloTrabajo = trabajo?.titulo ?? undefined;
    }

    const { data: numero, error } = await supabase.rpc("contactar_profesional", {
      p_profesional: profesionalId,
      p_origen: origen,
      ...(trabajoId ? { p_trabajo: trabajoId } : {}),
    });
    if (error) return { mensaje: mensajeDeError(error.code) };
    if (typeof numero !== "string" || !/^\d{8,15}$/.test(numero)) {
      return { mensaje: MENSAJE_FALLA };
    }

    const mensaje = armarMensajeContacto({
      origen,
      nombreProfesional: perfil.nombre,
      profesion: profesionPrincipal(perfil.oficios).toLowerCase(),
      barrioCliente,
      tituloTrabajo,
    });
    return { url: linkWhatsApp(`+${numero}`, mensaje) };
  } catch {
    return { mensaje: MENSAJE_FALLA };
  }
}
