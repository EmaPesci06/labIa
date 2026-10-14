"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rolFalso } from "@/lib/auth/sesion-falsa";
import type { EstadoFormulario } from "@/lib/auth/estado";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarIntentos } from "@/lib/rate-limit";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import {
  MAX_TRABAJOS_ABIERTOS,
  rutaTrabajoPublicado,
  MENSAJE_LIMITE_ABIERTOS,
  erroresDeTrabajo,
  esquemaFotos,
  esquemaTrabajo,
} from "@/lib/validaciones/trabajo";

/** Estado de `publicarTrabajo`: si trae `trabajoId`, el trabajo ya existe y faltan las fotos. */
export type EstadoPublicar = EstadoFormulario & { trabajoId?: string };

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

  const limite = limitarIntentos(`publicar-trabajo:${sesion.usuario.id}`, REGLA_PUBLICAR);
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

  // Con fotos, el navegador las sube a `fotos/trabajos/<id>/` y después llama a `adjuntarFotos`.
  if (trabajo.cantidadFotos > 0) return { trabajoId: id, valores };
  redirect(rutaTrabajoPublicado(id));
}

/** Guarda en el trabajo las rutas de las fotos que el navegador ya subió. */
export async function adjuntarFotos(trabajoId: string, rutas: string[]): Promise<{ ok: boolean }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "cliente") return { ok: false };
  if (!/^[0-9a-f-]{36}$/.test(trabajoId)) return { ok: false };
  const validas = esquemaFotos(trabajoId).safeParse(rutas);
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

  if (!/^[0-9a-f-]{36}$/.test(postulacionId)) {
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
  const { data, error } = await supabase
    .from("postulaciones")
    .update({ estado: "retirada" })
    .eq("id", postulacionId)
    .eq("profesional_id", sesion.usuario.id)
    .eq("estado", "enviada")
    .select("id");

  if (error || !data || data.length === 0) {
    return {
      ok: false,
      mensaje: "No se pudo retirar la postulación. Verificá que siga enviada.",
    };
  }

  revalidatePath("/trabajos");
  return { ok: true };
}
