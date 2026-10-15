"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rolFalso } from "@/lib/auth/sesion-falsa";
import type { EstadoFormulario } from "@/lib/auth/estado";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { avisarEleccion, avisarNuevaPostulacion } from "@/lib/emails/avisos";
import {
  erroresDePostulacion,
  esquemaPostulacion,
  type ErroresPostulacion,
} from "@/lib/validaciones/postulacion";
import * as Sentry from "@sentry/nextjs";

import { quitarFotosDelTrabajo } from "@/lib/trabajos/quitar-fotos";
import { esUuid } from "@/lib/validaciones/uuid";
import {
  MAX_TRABAJOS_ABIERTOS,
  rutaTrabajoPublicado,
  MENSAJE_LIMITE_ABIERTOS,
  erroresDeTrabajo,
  esquemaFotos,
  esquemaTrabajo,
} from "@/lib/validaciones/trabajo";

/**
 * Estado de `publicarTrabajo`: si trae `trabajoId`, el trabajo ya existe y faltan las fotos.
 * `carpetaFotos` es `<cliente_id>/<trabajo_id>`: la carpeta donde el navegador sube las fotos (LAB-52).
 */
export type EstadoPublicar = EstadoFormulario & { trabajoId?: string; carpetaFotos?: string };

const REGLA_PUBLICAR = { maximo: 5, ventanaMs: 10 * 60_000 } as const;
const MENSAJE_GENERAL = "No pudimos publicar tu trabajo. Probá de nuevo en unos minutos.";

const texto = (datos: FormData, clave: string): string => {
  const valor = datos.get(clave);
  return typeof valor === "string" ? valor : "";
};

export async function publicarTrabajo(
  _anterior: EstadoPublicar,
  datos: FormData,
): Promise<EstadoPublicar> {
  const valores = {
    oficio: texto(datos, "oficio"),
    titulo: texto(datos, "titulo"),
    descripcion: texto(datos, "descripcion"),
    barrioId: texto(datos, "barrioId"),
    urgencia: texto(datos, "urgencia"),
    presupuesto: texto(datos, "presupuesto"),
  };

  const sesion = await obtenerSesion();
  if (!sesion) return { mensaje: "Ingresá para publicar un trabajo.", valores };
  if (sesion.rol !== "cliente") {
    return { mensaje: "Solo los clientes pueden publicar trabajos.", valores };
  }

  const resultado = esquemaTrabajo.safeParse({
    ...valores,
    cantidadFotos: texto(datos, "cantidadFotos") || "0",
  });
  if (!resultado.success) return { errores: erroresDeTrabajo(resultado.error), valores };
  const trabajo = resultado.data;

  const limite = await limitarPersistente(`publicar-trabajo:${sesion.usuario.id}`, REGLA_PUBLICAR);
  if (!limite.permitido) {
    return {
      mensaje: `Hiciste demasiados intentos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
      valores,
    };
  }

  let id: string;
  if (rolFalso()) {
    // Sesión falsa de desarrollo/e2e: no hay base, se simula la publicación.
    id = randomUUID();
  } else {
    if (!supabaseConfigurado()) return { mensaje: MENSAJE_GENERAL, valores };
    const supabase = await crearClienteServidor();

    const { count, error: errorConteo } = await supabase
      .from("trabajos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", sesion.usuario.id)
      .eq("estado", "abierto");
    if (errorConteo) return { mensaje: MENSAJE_GENERAL, valores };
    if ((count ?? 0) >= MAX_TRABAJOS_ABIERTOS) {
      return { mensaje: MENSAJE_LIMITE_ABIERTOS, valores };
    }

    const { data, error } = await supabase
      .from("trabajos")
      .insert({
        cliente_id: sesion.usuario.id,
        oficio: trabajo.oficio,
        titulo: trabajo.titulo,
        descripcion: trabajo.descripcion,
        barrio_id: trabajo.barrioId,
        urgencia: trabajo.urgencia,
        presupuesto_estimado: trabajo.presupuesto ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      return {
        errores: error?.code === "23503" ? { barrioId: "Ese barrio no existe." } : undefined,
        mensaje: error?.code === "23503" ? undefined : MENSAJE_GENERAL,
        valores,
      };
    }
    id = data.id;
  }

  // Evento de métricas: sin datos personales, solo oficio y urgencia.
  await registrarEventoServidor(sesion.usuario.id, "trabajo_publicado", {
    oficio: trabajo.oficio,
    urgencia: trabajo.urgencia,
  });

  // Con fotos, el navegador las sube al bucket privado `fotos-trabajos` en `<cliente>/<id>/` y
  // después llama a `adjuntarFotos`.
  if (trabajo.cantidadFotos > 0) {
    return { trabajoId: id, carpetaFotos: `${sesion.usuario.id}/${id}`, valores };
  }
  redirect(rutaTrabajoPublicado(id));
}

/** Guarda en el trabajo las rutas de las fotos que el navegador ya subió. */
export async function adjuntarFotos(trabajoId: string, rutas: string[]): Promise<{ ok: boolean }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") return { ok: false };
  if (!esUuid(trabajoId)) return { ok: false };
  const validas = esquemaFotos(trabajoId, sesion.usuario.id).safeParse(rutas);
  if (!validas.success) return { ok: false };

  if (rolFalso()) return { ok: true };
  if (!supabaseConfigurado()) return { ok: false };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("trabajos")
    .update({ fotos: validas.data })
    .eq("id", trabajoId)
    .eq("cliente_id", sesion.usuario.id)
    .select("id");
  // Si no se actualizó ninguna fila (no es suyo o no existe), no es un éxito.
  return { ok: !error && (data?.length ?? 0) > 0 };
}

/**
 * Retira una postulación enviada por el profesional (LAB-27).
 * Solo se puede retirar mientras su estado sea 'enviada'.
 */
export async function retirarPostulacion(
  postulacionId: string,
): Promise<{ ok: boolean; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "profesional") {
    return { ok: false, mensaje: "Solo un profesional puede retirar su postulación." };
  }

  if (!esUuid(postulacionId)) {
    return { ok: false, mensaje: "Identificador de postulación inválido." };
  }

  if (rolFalso()) {
    revalidatePath("/trabajos");
    return { ok: true };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "No pudimos conectar con el servidor." };
  }

  const supabase = await crearClienteServidor();
  // El estado de la postulación solo cambia por la función retirar_postulacion (LAB-44).
  const { error } = await supabase.rpc("retirar_postulacion", {
    p_postulacion_id: postulacionId,
  });

  if (error) {
    return {
      ok: false,
      mensaje: "No se pudo retirar la postulación. Verificá que siga enviada.",
    };
  }

  revalidatePath("/trabajos");
  revalidatePath("/trabajos/[id]", "page");
  revalidatePath("/mis-trabajos");
  return { ok: true };
}

export type EstadoPostulacion = EstadoFormulario & {
  errores?: ErroresPostulacion;
  ok?: boolean;
  postulacionId?: string;
};

const REGLA_POSTULAR = { maximo: 30, ventanaMs: 24 * 60 * 60 * 1000 } as const;
const MENSAJE_LIMITE_POSTULAR = "Alcanzaste el límite de 30 postulaciones por día. Intentá mañana.";
const MENSAJE_NO_ENVIADA = "No pudimos enviar tu postulación. Probá de nuevo en unos minutos.";

/** Cuenta un intento de postulación del profesional (30 por día). Devuelve si todavía puede. */
async function puedePostular(usuarioId: string): Promise<boolean> {
  return (await limitarPersistente(`postulacion:${usuarioId}`, REGLA_POSTULAR)).permitido;
}

/**
 * Envía una postulación de un profesional a un trabajo abierto (LAB-28).
 * El formulario la vincula al trabajo con `postularme.bind(null, trabajoId)`.
 *
 * Orden: sesión y rol → id → entrada (Zod) → perfil publicado → trabajo abierto → oficio →
 * postulación previa → límite de intentos → escritura. Una postulación retirada se reactiva
 * (LAB-44) en vez de rechazarse. Si el aviso o la métrica fallan, la postulación ya está guardada
 * y la respuesta sigue siendo un éxito.
 */
export async function postularme(
  trabajoId: string,
  _anterior: EstadoPostulacion,
  datos: FormData,
): Promise<EstadoPostulacion> {
  const sesion = await obtenerSesion();
  if (!sesion) {
    return { mensaje: "Tu sesión venció. Ingresá de nuevo para postularte." };
  }
  if (sesion.rol !== "profesional") {
    return { mensaje: "Solo las cuentas de profesional pueden postularse a trabajos." };
  }
  if (!esUuid(trabajoId)) {
    return { mensaje: "Identificador de trabajo inválido." };
  }

  const valores = {
    mensaje: texto(datos, "mensaje"),
    precioEstimado: texto(datos, "precioEstimado"),
    senaPropuesta: texto(datos, "senaPropuesta"),
  };

  const valid = esquemaPostulacion.safeParse(valores);
  if (!valid.success) {
    return { errores: erroresDePostulacion(valid.error), valores };
  }

  if (rolFalso()) {
    if (!(await puedePostular(sesion.usuario.id))) {
      return { mensaje: MENSAJE_LIMITE_POSTULAR, valores };
    }
    revalidarPostulacion(trabajoId);
    return { ok: true, postulacionId: randomUUID() };
  }

  if (!supabaseConfigurado()) {
    return { mensaje: "No pudimos conectar con el servidor.", valores };
  }

  const supabase = await crearClienteServidor();

  const { data: perfil } = await supabase
    .from("perfiles_profesionales")
    .select("publicado, oficios")
    .eq("usuario_id", sesion.usuario.id)
    .maybeSingle();
  if (!perfil || !perfil.publicado) {
    return { mensaje: "Vas a poder postularte cuando aprobemos tus documentos.", valores };
  }

  const { data: trabajo } = await supabase
    .from("trabajos")
    .select("id, oficio, estado")
    .eq("id", trabajoId)
    .maybeSingle();
  if (!trabajo || trabajo.estado !== "abierto") {
    return { mensaje: "Este trabajo ya no recibe postulaciones.", valores };
  }

  const oficios = perfil.oficios ?? [];
  if (!oficios.includes(trabajo.oficio)) {
    return { mensaje: "Solo podés postularte a trabajos de tus oficios.", valores };
  }

  const { data: previa } = await supabase
    .from("postulaciones")
    .select("id, estado")
    .eq("trabajo_id", trabajoId)
    .eq("profesional_id", sesion.usuario.id)
    .maybeSingle();
  if (previa && previa.estado !== "retirada") {
    return { mensaje: "Ya te postulaste a este trabajo.", valores };
  }

  if (!(await puedePostular(sesion.usuario.id))) {
    return { mensaje: MENSAJE_LIMITE_POSTULAR, valores };
  }

  let postulacionId: string;
  if (previa) {
    // Retirada: vuelve a enviarse con el mensaje, el precio y la seña nuevos (LAB-44).
    const { data: reactivada, error } = await supabase.rpc("reactivar_postulacion", {
      p_trabajo_id: trabajoId,
      p_mensaje: valid.data.mensaje,
      p_precio_estimado: valid.data.precioEstimado,
      p_sena_propuesta: valid.data.senaPropuesta,
    });
    if (error || !reactivada) {
      const mensaje =
        error?.code === "22023" ? "Este trabajo ya no recibe postulaciones." : MENSAJE_NO_ENVIADA;
      return { mensaje, valores };
    }
    postulacionId = reactivada;
  } else {
    const { data: nueva, error } = await supabase
      .from("postulaciones")
      .insert({
        trabajo_id: trabajoId,
        profesional_id: sesion.usuario.id,
        mensaje: valid.data.mensaje,
        precio_estimado: valid.data.precioEstimado ?? null,
        sena_propuesta: valid.data.senaPropuesta ?? null,
        estado: "enviada",
      })
      .select("id")
      .single();
    if (error || !nueva) {
      if (error?.code === "23505") return { mensaje: "Ya te postulaste a este trabajo.", valores };
      return { mensaje: MENSAJE_NO_ENVIADA, valores };
    }
    postulacionId = nueva.id;
  }

  // Métrica y aviso: si fallan, la postulación ya está guardada y no cambia la respuesta.
  try {
    await registrarEventoServidor(sesion.usuario.id, "postulacion_enviada", {
      oficio: trabajo.oficio,
    });
  } catch {
    // La métrica no debe romper la postulación.
  }
  try {
    await avisarNuevaPostulacion(postulacionId);
  } catch {
    // El aviso por email no debe romper la postulación.
  }

  revalidarPostulacion(trabajoId);
  return { ok: true, postulacionId };
}

function revalidarPostulacion(trabajoId: string): void {
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);
  revalidatePath("/mis-trabajos");
}

/**
 * El cliente elige a un postulante para su trabajo abierto (LAB-29).
 * Invoca el RPC transaccional elegir_postulante, dispara avisos por email y métrica.
 */
export async function elegirPostulante(
  postulacionId: string,
  trabajoId: string,
): Promise<{ ok: boolean; profesionalId?: string; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") {
    return { ok: false, mensaje: "Solo el cliente dueño del trabajo puede elegir un postulante." };
  }

  if (!esUuid(postulacionId) || !esUuid(trabajoId)) {
    return { ok: false, mensaje: "Identificador inválido." };
  }

  if (rolFalso()) {
    revalidatePath("/mis-trabajos");
    revalidatePath(`/mis-trabajos/${trabajoId}`);
    return { ok: true, profesionalId: "11111111-1111-4111-8111-111111111111" };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "No pudimos conectar con el servidor." };
  }

  const supabase = await crearClienteServidor();
  const { data: profesionalId, error } = await supabase.rpc("elegir_postulante", {
    p_postulacion_id: postulacionId,
  });

  if (error || !profesionalId) {
    const msj =
      error?.code === "22023"
        ? "No podés elegir a este postulante: el trabajo ya no está abierto o el profesional ya no está disponible."
        : "No pudimos elegir al profesional. Verificá que el trabajo siga abierto.";
    return { ok: false, mensaje: msj };
  }

  // Métricas
  await registrarEventoServidor(sesion.usuario.id, "postulante_elegido");

  // Avisos por email: al elegido y a los demás postulantes
  await avisarEleccion(trabajoId, sesion.usuario.id);

  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${trabajoId}`);
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);

  return { ok: true, profesionalId };
}

/**
 * El cliente cambia de profesional contratado volviendo a abrir el trabajo (LAB-29).
 */
export async function cambiarProfesional(
  trabajoId: string,
): Promise<{ ok: boolean; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") {
    return { ok: false, mensaje: "Solo el cliente dueño puede cambiar de profesional." };
  }

  if (!esUuid(trabajoId)) {
    return { ok: false, mensaje: "Identificador inválido." };
  }

  if (rolFalso()) {
    revalidatePath("/mis-trabajos");
    revalidatePath(`/mis-trabajos/${trabajoId}`);
    return { ok: true };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "No pudimos conectar con el servidor." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_profesional", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo cambiar de profesional." };
  }

  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${trabajoId}`);
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);

  return { ok: true };
}

/**
 * Marca el trabajo contratado como completado/cerrado para habilitar la reseña (LAB-29).
 */
export async function marcarTrabajoTerminado(
  trabajoId: string,
): Promise<{ ok: boolean; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") {
    return { ok: false, mensaje: "Solo el cliente dueño puede marcar el trabajo como terminado." };
  }

  if (!esUuid(trabajoId)) {
    return { ok: false, mensaje: "Identificador inválido." };
  }

  if (rolFalso()) {
    revalidatePath("/mis-trabajos");
    revalidatePath(`/mis-trabajos/${trabajoId}`);
    return { ok: true };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "No pudimos conectar con el servidor." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("marcar_trabajo_terminado", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo marcar el trabajo como terminado." };
  }

  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${trabajoId}`);
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);

  return { ok: true };
}

/**
 * Cancela un trabajo del cliente (LAB-29).
 */
export async function cancelarTrabajo(
  trabajoId: string,
): Promise<{ ok: boolean; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") {
    return { ok: false, mensaje: "Solo el cliente dueño puede cancelar el trabajo." };
  }

  if (!esUuid(trabajoId)) {
    return { ok: false, mensaje: "Identificador inválido." };
  }

  if (rolFalso()) {
    revalidatePath("/mis-trabajos");
    revalidatePath(`/mis-trabajos/${trabajoId}`);
    return { ok: true };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: "No pudimos conectar con el servidor." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cancelar_trabajo", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    return { ok: false, mensaje: "No se pudo cancelar el trabajo." };
  }

  // Las fotos se quitan al cancelar (LAB-52): toda la carpeta del trabajo, no solo lo que figura en
  // `trabajos.fotos`. Si Storage falla, la base ya dejó el borrado programado para el job diario.
  const quitadas = await quitarFotosDelTrabajo(supabase, sesion.usuario.id, trabajoId);
  if (!quitadas.ok) {
    Sentry.captureException(new Error("No se pudieron quitar las fotos al cancelar un trabajo"));
  }

  revalidatePath("/mis-trabajos");
  revalidatePath(`/mis-trabajos/${trabajoId}`);
  revalidatePath("/trabajos");
  revalidatePath(`/trabajos/${trabajoId}`);

  return { ok: true };
}
