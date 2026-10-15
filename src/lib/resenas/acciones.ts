"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { rolFalso } from "@/lib/auth/sesion-falsa";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarIntentos } from "@/lib/rate-limit";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { esquemaGuardarResena, type EntradaGuardarResena } from "@/lib/validaciones/resenas";

export type ResultadoGuardarResena =
  | { ok: true; id: string; accion: "creada" | "actualizada" }
  | { ok: false; error: string; codigo?: string };

export type ResenaPropia = {
  id: string;
  puntaje: number;
  texto: string | null;
  createdAt: string;
};

export type EstadoElegibilidadResena = {
  puedeResenar: boolean;
  resenaPropia: ResenaPropia | null;
  motivo?: string;
};

const HORAS_24_MS = 24 * 60 * 60 * 1000;
const MENSAJE_FALLA = "No pudimos guardar tu reseña. Probá de nuevo en unos minutos.";

/**
 * Consulta si el cliente en sesión puede dejar una reseña (o editar la suya) para el profesional.
 */
export async function consultarElegibilidadResena(
  profesionalId: string,
): Promise<EstadoElegibilidadResena> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") {
    return { puedeResenar: false, resenaPropia: null, motivo: "Requiere sesión de cliente." };
  }
  if (sesion.usuario.id === profesionalId) {
    return { puedeResenar: false, resenaPropia: null, motivo: "No podés reseñarte a vos mismo." };
  }

  if (rolFalso()) {
    return { puedeResenar: true, resenaPropia: null };
  }

  if (!supabaseConfigurado()) {
    return { puedeResenar: false, resenaPropia: null, motivo: "Servidor no configurado." };
  }

  const supabase = await crearClienteServidor();

  // 1. ¿Ya dejó una reseña?
  const { data: existente } = await supabase
    .from("resenas")
    .select("id, puntaje, texto, created_at")
    .eq("autor_id", sesion.usuario.id)
    .eq("profesional_id", profesionalId)
    .maybeSingle();

  if (existente) {
    const creadaHaceMs = Date.now() - new Date(existente.created_at).getTime();
    const editable = creadaHaceMs <= HORAS_24_MS;
    return {
      puedeResenar: editable,
      resenaPropia: {
        id: existente.id,
        puntaje: existente.puntaje,
        texto: existente.texto,
        createdAt: existente.created_at,
      },
      motivo: editable ? undefined : "Pasaron más de 24 horas desde que publicaste la reseña.",
    };
  }

  // 2. ¿Tiene contacto registrado?
  const { data: contacto } = await supabase
    .from("contactos")
    .select("id")
    .eq("cliente_id", sesion.usuario.id)
    .eq("profesional_id", profesionalId)
    .limit(1)
    .maybeSingle();

  if (contacto) {
    return { puedeResenar: true, resenaPropia: null };
  }

  // 3. ¿El profesional fue elegido en algún trabajo del cliente?
  const { data: trabajo } = await supabase
    .from("trabajos")
    .select("id, postulaciones!inner(id, estado, profesional_id)")
    .eq("cliente_id", sesion.usuario.id)
    .eq("postulaciones.profesional_id", profesionalId)
    .eq("postulaciones.estado", "elegida")
    .limit(1)
    .maybeSingle();

  if (trabajo) {
    return { puedeResenar: true, resenaPropia: null };
  }

  return {
    puedeResenar: false,
    resenaPropia: null,
    motivo: "Solo podés reseñar a profesionales que hayas contactado o contratado.",
  };
}

/**
 * Guarda o edita una reseña de un cliente a un profesional (LAB-31).
 * - Valida sesión de rol 'cliente' y cuenta activa.
 * - Valida elegibilidad (contacto previo o contratación en trabajo).
 * - Una reseña por cliente y profesional; edición permitida dentro de las 24 h.
 * - Reseñas con 1 o 2 estrellas se registran en reportes para moderación.
 * - Emite métrica PostHog `resena_publicada`.
 */
export async function guardarResena(
  entrada: EntradaGuardarResena,
): Promise<ResultadoGuardarResena> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return { ok: false, error: "Tu sesión venció. Ingresá de nuevo para dejar tu reseña." };
  }
  if (sesion.rol !== "cliente") {
    return { ok: false, error: "Solo los clientes pueden dejar reseñas." };
  }

  const parseo = esquemaGuardarResena.safeParse(entrada);
  if (!parseo.success) {
    const primero = parseo.error.issues[0];
    return {
      ok: false,
      error: primero?.message ?? "Revisá los datos de la reseña.",
      codigo: primero?.path[0] === "texto" ? "texto" : undefined,
    };
  }

  const { profesionalId, puntaje, texto, trabajoId } = parseo.data;

  if (sesion.usuario.id === profesionalId) {
    return { ok: false, error: "No podés dejarte una reseña a vos mismo." };
  }

  const limite = limitarIntentos(`resena:${sesion.usuario.id}`, {
    maximo: 5,
    ventanaMs: 60_000,
  });
  if (!limite.permitido) {
    return {
      ok: false,
      error: `Hiciste demasiados intentos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
    };
  }

  if (rolFalso()) {
    await registrarEventoServidor(sesion.usuario.id, "resena_publicada", {
      puntaje: puntaje as 1 | 2 | 3 | 4 | 5,
    });
    revalidatePath(`/profesionales/${profesionalId}`);
    revalidatePath("/buscar");
    revalidatePath("/mis-trabajos");
    if (trabajoId) revalidatePath(`/mis-trabajos/${trabajoId}`);
    return { ok: true, id: randomUUID(), accion: "creada" };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, error: MENSAJE_FALLA };
  }

  const supabase = await crearClienteServidor();

  // Validar cuenta activa
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("estado")
    .eq("id", sesion.usuario.id)
    .maybeSingle();

  if (usuario && usuario.estado !== "activa") {
    return { ok: false, error: "Tu cuenta no está activa para dejar reseñas." };
  }

  // Validar elegibilidad
  const { data: contacto } = await supabase
    .from("contactos")
    .select("id")
    .eq("cliente_id", sesion.usuario.id)
    .eq("profesional_id", profesionalId)
    .limit(1)
    .maybeSingle();

  let esElegible = Boolean(contacto);

  if (!esElegible) {
    const { data: trabajo } = await supabase
      .from("trabajos")
      .select("id, postulaciones!inner(id, estado, profesional_id)")
      .eq("cliente_id", sesion.usuario.id)
      .eq("postulaciones.profesional_id", profesionalId)
      .eq("postulaciones.estado", "elegida")
      .limit(1)
      .maybeSingle();

    esElegible = Boolean(trabajo);
  }

  if (!esElegible) {
    return {
      ok: false,
      error: "Solo podés calificar a profesionales que contactaste o contrataste.",
    };
  }

  // Buscar reseña previa para determinar si es creación o edición
  const { data: existente } = await supabase
    .from("resenas")
    .select("id, created_at")
    .eq("autor_id", sesion.usuario.id)
    .eq("profesional_id", profesionalId)
    .maybeSingle();

  let resenaId: string;
  let accion: "creada" | "actualizada";

  if (existente) {
    const creadaHaceMs = Date.now() - new Date(existente.created_at).getTime();
    if (creadaHaceMs > HORAS_24_MS) {
      return {
        ok: false,
        error: "Pasaron más de 24 horas desde que publicaste la reseña: ya no se puede editar.",
      };
    }

    const { error: errorUpdate } = await supabase
      .from("resenas")
      .update({
        puntaje,
        texto,
      })
      .eq("id", existente.id);

    if (errorUpdate) {
      return { ok: false, error: "No pudimos actualizar la reseña. Probá de nuevo." };
    }

    resenaId = existente.id;
    accion = "actualizada";
  } else {
    const { data: creada, error: errorInsert } = await supabase
      .from("resenas")
      .insert({
        autor_id: sesion.usuario.id,
        profesional_id: profesionalId,
        trabajo_id: trabajoId ?? null,
        puntaje,
        texto,
      })
      .select("id")
      .single();

    if (errorInsert || !creada) {
      return { ok: false, error: "No pudimos guardar la reseña. Probá de nuevo." };
    }

    resenaId = creada.id;
    accion = "creada";
  }

  // Las calificaciones de 1 o 2 estrellas abren el reporte de moderación en la base (trigger
  // `resenas_moderar`, migración 20261015070000): así también lo cubren los inserts directos.

  // Métrica PostHog
  await registrarEventoServidor(sesion.usuario.id, "resena_publicada", {
    puntaje: puntaje as 1 | 2 | 3 | 4 | 5,
  });

  // Revalidar páginas afectadas
  revalidatePath(`/profesionales/${profesionalId}`);
  revalidatePath("/buscar");
  revalidatePath("/mis-trabajos");
  if (trabajoId) {
    revalidatePath(`/mis-trabajos/${trabajoId}`);
  }

  return { ok: true, id: resenaId, accion };
}

export const publicarResena = guardarResena;
