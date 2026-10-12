// Datos y formatos del perfil público del profesional (LAB-24). Sin acceso a la base: se testea solo.

import type { Oficio } from "@/lib/busqueda";

/** Nombre del oficio, como se lista en "Oficios". */
export const ETIQUETA_OFICIO: Record<Oficio, string> = {
  carpinteria: "Carpintería",
  plomeria: "Plomería",
  cerrajeria: "Cerrajería",
  gas: "Gas",
  pintura: "Pintura",
  mecanica: "Mecánica",
  electricidad: "Electricidad",
};

/** Cómo se llama la persona que ejerce el oficio: "Gasista", "Plomero". */
export const PROFESION_POR_OFICIO: Record<Oficio, string> = {
  carpinteria: "Carpintero",
  plomeria: "Plomero",
  cerrajeria: "Cerrajero",
  gas: "Gasista",
  pintura: "Pintor",
  mecanica: "Mecánico",
  electricidad: "Electricista",
};

/** Cuántas reseñas se muestran de entrada y cuántas se suman por cada "Ver más". */
export const RESENAS_INICIALES = 3;
export const RESENAS_POR_PAGINA = 10;

/**
 * "Martín Gómez" con apellido completo (sesión de cliente o dueño) o "Martín G." con la inicial.
 * La inicial viene de la base: este helper nunca inventa un apellido.
 */
export function nombreMostrado(
  nombre: string | null,
  apellido: string | null,
  apellidoInicial: string | null,
): string {
  const pila = (nombre ?? "").trim() || "Profesional";
  const completo = (apellido ?? "").trim();
  if (completo) return `${pila} ${completo}`;
  const inicial = (apellidoInicial ?? "").trim();
  return inicial ? `${pila} ${inicial}.` : pila;
}

/** "Laura F." para el autor de una reseña. */
export function autorResena(nombre: string | null, apellidoInicial: string | null): string {
  const pila = (nombre ?? "").trim() || "Cliente";
  const inicial = (apellidoInicial ?? "").trim();
  return inicial ? `${pila} ${inicial}.` : pila;
}

/** "Gasista" (el primer oficio de la lista es el principal). */
export function profesionPrincipal(oficios: readonly Oficio[]): string {
  const primero = oficios[0];
  return primero ? PROFESION_POR_OFICIO[primero] : "Profesional";
}

/** "Gasista · 12 años de experiencia"; sin años, solo "Gasista". */
export function lineaOficio(oficios: readonly Oficio[], aniosExperiencia: number | null): string {
  const profesion = profesionPrincipal(oficios);
  if (aniosExperiencia === null || aniosExperiencia === undefined) return profesion;
  if (aniosExperiencia <= 0) return `${profesion} · Recién empieza`;
  const anios = aniosExperiencia === 1 ? "1 año" : `${aniosExperiencia} años`;
  return `${profesion} · ${anios} de experiencia`;
}

/** "Gas, Plomería". */
export function textoOficios(oficios: readonly Oficio[]): string {
  return oficios.map((o) => ETIQUETA_OFICIO[o]).join(", ");
}

const unDecimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 4.9 → "4,9". */
export function formatearPromedio(promedio: number): string {
  return unDecimal.format(promedio);
}

/** "1 reseña" / "23 reseñas". */
export function textoCantidadResenas(cantidad: number): string {
  return cantidad === 1 ? "1 reseña" : `${cantidad} reseñas`;
}

/** "1 estrella" / "5 estrellas". */
export function textoPuntaje(puntaje: number): string {
  return puntaje === 1 ? "1 estrella" : `${puntaje} estrellas`;
}

/** "Pérdidas de gas, Calefactores" → ["Pérdidas de gas", "Calefactores"]. */
export function separarEspecialidades(especialidades: string | null): string[] {
  if (!especialidades) return [];
  return especialidades
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** Título de la pestaña: "Martín G. · Gasista en Mar del Plata · LabÍA". */
export function tituloPerfil(nombre: string, oficios: readonly Oficio[]): string {
  return `${nombre} · ${profesionPrincipal(oficios)} en Mar del Plata · LabÍA`;
}

/** Descripción corta para buscadores y vistas previas (máx. 160 caracteres). */
export function descripcionCorta(
  nombre: string,
  oficios: readonly Oficio[],
  descripcion: string | null,
): string {
  const base = (descripcion ?? "").replace(/\s+/g, " ").trim();
  const texto =
    base ||
    `${nombre} ofrece servicios de ${textoOficios(oficios).toLowerCase()} en Mar del Plata.`;
  return texto.length > 160 ? `${texto.slice(0, 157).trimEnd()}…` : texto;
}
