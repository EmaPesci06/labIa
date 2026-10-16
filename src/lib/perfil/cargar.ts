import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Oficio } from "@/lib/busqueda";
import { haceCuanto } from "@/lib/formato";
import type { Database } from "@/lib/supabase/tipos";

import { urlFoto } from "@/lib/fotos";

import { autorResena, nombreMostrado } from "./datos";

const esquemaId = z.uuid();

/** ¿Es un uuid? Evita ir a la base con cualquier cosa que venga en la URL. */
export const esIdValido = (id: string): boolean => esquemaId.safeParse(id).success;

/**
 * Lo que la página muestra de un profesional. Sin whatsapp, email, DNI ni documentos: la función
 * `perfil_profesional` no los devuelve y acá tampoco se piden.
 */
export type PerfilPublico = {
  id: string;
  /** "Martín Gómez" (cliente, dueño) o "Martín G." (sin sesión, profesional ajeno). */
  nombre: string;
  nombreCompleto: boolean;
  fotoUrl: string | null;
  barrioId: number | null;
  oficios: Oficio[];
  especialidades: string | null;
  descripcion: string | null;
  aniosExperiencia: number | null;
  zonasTexto: string;
  disponibilidad: string | null;
  fotosTrabajos: string[];
  identidadVerificada: boolean;
  antecedentesOk: boolean;
  matriculado: boolean;
  publicado: boolean;
  promedio: number | null;
  cantidadResenas: number;
  esPropio: boolean;
};

export type ResenaPerfil = {
  id: string;
  autor: string;
  puntaje: number;
  texto: string | null;
  cuando: string;
};

export type PaginaResenas = { resenas: ResenaPerfil[]; total: number };

/**
 * Perfil de un profesional con `public.perfil_profesional` (LAB-24). La función decide quién lo ve
 * (publicado, dueño o admin) y si el apellido sale completo; sin filas devuelve `null` (404).
 */
export async function obtenerPerfil(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PerfilPublico | null> {
  if (!esIdValido(id)) return null;

  const { data, error } = await supabase.rpc("perfil_profesional", { p_id: id });
  if (error) throw new Error("No pudimos cargar el perfil.");
  const fila = data?.[0];
  if (!fila) return null;

  return {
    id: fila.usuario_id,
    nombre: nombreMostrado(fila.nombre, fila.apellido, fila.apellido_inicial),
    nombreCompleto: Boolean(fila.apellido),
    fotoUrl: urlFoto(fila.foto_path),
    barrioId: fila.barrio_id ?? null,
    oficios: fila.oficios,
    especialidades: fila.especialidades ?? null,
    descripcion: fila.descripcion ?? null,
    aniosExperiencia: fila.anios_experiencia ?? null,
    zonasTexto: fila.zonas_texto ?? "",
    disponibilidad: fila.disponibilidad ?? null,
    fotosTrabajos: (fila.fotos_trabajos ?? [])
      .map((ruta) => urlFoto(ruta))
      .filter((url): url is string => url !== null),
    identidadVerificada: fila.identidad_verificada,
    antecedentesOk: fila.antecedentes_ok,
    matriculado: fila.matriculado,
    publicado: fila.publicado,
    promedio: fila.promedio === null || fila.promedio === undefined ? null : Number(fila.promedio),
    cantidadResenas: fila.cantidad_resenas,
    esPropio: fila.es_propio,
  };
}

/**
 * Reseñas del profesional, de la más nueva a la más vieja. Se leen de la vista `resenas_publicas`
 * (LAB-56): no trae autor_id ni trabajo_id; el autor llega como nombre e inicial del apellido,
 * nunca el apellido completo.
 */
export async function obtenerResenas(
  supabase: SupabaseClient<Database>,
  profesionalId: string,
  desde: number,
  cantidad: number,
  ahora: Date = new Date(),
): Promise<PaginaResenas> {
  if (!esIdValido(profesionalId)) return { resenas: [], total: 0 };

  const { data, count, error } = await supabase
    .from("resenas_publicas")
    .select("id, puntaje, texto, created_at, autor_nombre, autor_inicial", { count: "exact" })
    .eq("profesional_id", profesionalId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(desde, desde + cantidad - 1);
  if (error) throw new Error("No pudimos cargar las reseñas.");

  const filas = data ?? [];
  return {
    resenas: filas.flatMap((fila) => {
      if (fila.id === null || fila.puntaje === null || fila.created_at === null) return [];
      return [
        {
          id: fila.id,
          autor: autorResena(fila.autor_nombre, fila.autor_inicial),
          puntaje: fila.puntaje,
          texto: fila.texto,
          cuando: haceCuanto(fila.created_at, ahora),
        },
      ];
    }),
    total: count ?? filas.length,
  };
}

/**
 * Distancia en km entre el barrio del cliente y el del profesional (centros de barrio, nunca
 * direcciones). `null` si falta alguno de los dos barrios o la consulta falla.
 */
export async function distanciaEntreBarrios(
  supabase: SupabaseClient<Database>,
  barrioCliente: number | null,
  barrioProfesional: number | null,
): Promise<number | null> {
  if (barrioCliente === null || barrioProfesional === null) return null;
  const { data, error } = await supabase.rpc("distancia_km", {
    barrio_a: barrioCliente,
    barrio_b: barrioProfesional,
  });
  if (error || data === null || data === undefined) return null;
  return Number(data);
}
