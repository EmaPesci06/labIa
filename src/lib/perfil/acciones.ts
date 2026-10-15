"use server";

import { z } from "zod";

import type { EstadoFormulario } from "@/lib/auth/estado";
import { limitarPorIp } from "@/lib/rate-limit-persistente";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { datosDeFormularioPerfil, esquemaPerfilProfesional } from "@/lib/validaciones/perfil";

import { obtenerResenas, type PaginaResenas } from "./cargar";
import { RESENAS_POR_PAGINA } from "./datos";

const MENSAJE_FALLA = "No pudimos completar la operación. Probá de nuevo en unos minutos.";

const esquemaMasResenas = z.object({
  profesionalId: z.uuid({ error: "Ese perfil no existe." }),
  desde: z.number().int().min(0).max(10_000),
});

export type RespuestaMasResenas = ({ ok: true } & PaginaResenas) | { ok: false; mensaje: string };

/**
 * "Ver todas" del perfil: devuelve la página siguiente de reseñas. Es información pública
 * (la tabla `resenas` se lee sin sesión), así que no exige rol; sí valida la entrada y frena el
 * abuso con un límite por IP.
 */
export async function cargarMasResenas(
  profesionalId: string,
  desde: number,
): Promise<RespuestaMasResenas> {
  const entrada = esquemaMasResenas.safeParse({ profesionalId, desde });
  if (!entrada.success) return { ok: false, mensaje: "No pudimos cargar más reseñas." };
  if (!supabaseConfigurado()) return { ok: false, mensaje: MENSAJE_FALLA };

  const limite = await limitarPorIp("resenas", { maximo: 30, ventanaMs: 60_000 });
  if (!limite.permitido) {
    return {
      ok: false,
      mensaje: `Hiciste demasiados pedidos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
    };
  }

  try {
    const supabase = await crearClienteServidor();
    const pagina = await obtenerResenas(
      supabase,
      entrada.data.profesionalId,
      entrada.data.desde,
      RESENAS_POR_PAGINA,
    );
    return { ok: true, ...pagina };
  } catch {
    return { ok: false, mensaje: "No pudimos cargar más reseñas. Probá de nuevo." };
  }
}

/**
 * Guarda la edición del perfil del profesional (`/cuenta/perfil`). Sesión, rol y entrada se
 * validan acá aunque la RLS también proteja: solo escribe en la fila del propio usuario y solo en
 * las columnas que el profesional puede editar. `publicado` y las insignias no se tocan.
 */
export async function actualizarPerfilProfesional(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await obtenerSesion();
  if (!sesion) return { mensaje: "Tu sesión venció. Ingresá de nuevo para editar tu perfil." };
  if (sesion.rol !== "profesional") {
    return { mensaje: "Solo las cuentas de profesional tienen un perfil para editar." };
  }

  const entrada = esquemaPerfilProfesional.safeParse(datosDeFormularioPerfil(datos));
  if (!entrada.success) {
    const errores: Record<string, string> = {};
    for (const problema of entrada.error.issues) {
      const campo = String(problema.path[0] ?? "general");
      if (!errores[campo]) errores[campo] = problema.message;
    }
    return { errores };
  }

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_FALLA };

  const d = entrada.data;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("perfiles_profesionales")
    .update({
      oficios: d.oficios,
      especialidades: d.especialidades,
      descripcion: d.descripcion,
      anios_experiencia: d.aniosExperiencia,
      disponibilidad: d.disponibilidad,
      toda_la_ciudad: d.todaLaCiudad,
      // Si trabaja en toda la ciudad no hace falta guardar zonas sueltas.
      zonas: d.todaLaCiudad ? [] : d.zonas,
    })
    .eq("usuario_id", sesion.usuario.id)
    .select("usuario_id");

  if (error) {
    return { mensaje: MENSAJE_FALLA };
  }
  if (!data || data.length === 0) {
    return { mensaje: "Todavía no tenés un perfil profesional. Completá tu registro primero." };
  }
  return { exito: "Guardamos los cambios de tu perfil." };
}
