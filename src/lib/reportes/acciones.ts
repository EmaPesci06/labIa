"use server";

import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { esquemaReporte, type DatosReporte } from "@/lib/validaciones/reportes";

import type { EstadoReporteForm } from "./estado";

const REGLA_RATE_LIMIT = { maximo: 10, ventanaMs: 24 * 60 * 60 * 1000 };

export async function enviarReporte(
  _anterior: EstadoReporteForm,
  formData: FormData,
): Promise<EstadoReporteForm> {
  const crudo = {
    objetivoTipo: formData.get("objetivoTipo"),
    objetivoId: formData.get("objetivoId"),
    motivo: formData.get("motivo"),
    detalle: formData.get("detalle") ?? "",
  };

  const parseo = esquemaReporte.safeParse(crudo);
  if (!parseo.success) {
    const errorFormato = parseo.error.format();
    return {
      errores: {
        motivo: errorFormato.motivo?._errors[0],
        detalle: errorFormato.detalle?._errors[0],
      },
    };
  }

  const datos: DatosReporte = parseo.data;

  const sesion = await obtenerSesion();
  if (!sesion) {
    return {
      mensaje: "Necesitás iniciar sesión para enviar un reporte.",
    };
  }

  // Rate limit persistente (LAB-47): cuenta en Postgres, compartido entre instancias.
  const limite = await limitarPersistente(`reporte:${sesion.usuario.id}`, REGLA_RATE_LIMIT);
  if (!limite.permitido) {
    return {
      mensaje: "Alcanzaste el límite de 10 reportes por día. Probá de nuevo mañana.",
    };
  }

  if (!supabaseConfigurado()) {
    // Solo en desarrollo local sin base se simula el envío. Fuera de ahí no hay éxito falso.
    if (process.env.NODE_ENV === "development") {
      return { exito: true, motivoEnviado: datos.motivo };
    }
    return { mensaje: "No pudimos enviar el reporte. Probá de nuevo más tarde." };
  }

  const supabase = await crearClienteServidor();

  // Validar autoreporte
  if (datos.objetivoTipo === "perfil" && datos.objetivoId === sesion.usuario.id) {
    return { mensaje: "No podés reportar tu propio perfil." };
  }

  if (datos.objetivoTipo === "trabajo") {
    const { data: trabajo } = await supabase
      .from("trabajos")
      .select("cliente_id")
      .eq("id", datos.objetivoId)
      .maybeSingle();

    if (trabajo && trabajo.cliente_id === sesion.usuario.id) {
      return { mensaje: "No podés reportar tu propio trabajo." };
    }
  }

  if (datos.objetivoTipo === "resena") {
    const { data: resena } = await supabase
      .from("resenas")
      .select("autor_id")
      .eq("id", datos.objetivoId)
      .maybeSingle();

    if (resena && resena.autor_id === sesion.usuario.id) {
      return { mensaje: "No podés reportar tu propia reseña." };
    }
  }

  // Comprobar si ya reportó este objetivo
  const { data: existente } = await supabase
    .from("reportes")
    .select("id")
    .eq("autor_id", sesion.usuario.id)
    .eq("objetivo_tipo", datos.objetivoTipo)
    .eq("objetivo_id", datos.objetivoId)
    .maybeSingle();

  if (existente) {
    return { mensaje: "Ya enviaste un reporte sobre este contenido." };
  }

  const { error } = await supabase.from("reportes").insert({
    autor_id: sesion.usuario.id,
    objetivo_tipo: datos.objetivoTipo,
    objetivo_id: datos.objetivoId,
    motivo: datos.motivo,
    detalle: datos.detalle ? datos.detalle : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { mensaje: "Ya enviaste un reporte sobre este contenido." };
    }
    if (error.code === "23514") {
      if (error.message.includes("límite")) {
        return { mensaje: "Alcanzaste el límite de 10 reportes por día." };
      }
      return { mensaje: "No fue posible registrar el reporte con los datos ingresados." };
    }
    return { mensaje: "No pudimos enviar el reporte. Por favor, probá de nuevo más tarde." };
  }

  await registrarEventoServidor(sesion.usuario.id, "reporte_enviado", {
    motivo: datos.motivo,
  });

  return { exito: true, motivoEnviado: datos.motivo };
}
