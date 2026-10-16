import { z } from "zod";

import { normalizarTelefono } from "@/lib/whatsapp";

import { MENSAJE_CONTENIDO_PUBLICO, nombreSinDatosDeContacto } from "./contenido-publico";

/** Los 7 barrios más comunes del registro (ids de la tabla `barrios`, migración de LAB-11). */
export const BARRIOS_FRECUENTES = [
  { id: 51, nombre: "La Perla" },
  { id: 17, nombre: "Centro" },
  { id: 20, nombre: "Chauvín" },
  { id: 67, nombre: "Los Troncos" },
  { id: 84, nombre: "Punta Mogotes" },
  { id: 22, nombre: "Constitución" },
  { id: 83, nombre: "Puerto" },
] as const;

export type BarrioOpcion = { id: number; nombre: string };

/** Minúsculas y sin acentos, para filtrar barrios mientras se escribe ("chauvin" encuentra "Chauvín"). */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Separa "Laura Fernández de Paz" en `nombre` (primera palabra) y `apellido` (el resto).
 * Con una sola palabra no hay apellido.
 */
export function separarNombre(completo: string): { nombre: string; apellido: string | null } {
  const palabras = completo.trim().split(/\s+/).filter(Boolean);
  const [nombre = "", ...resto] = palabras;
  return { nombre, apellido: resto.length ? resto.join(" ") : null };
}

export const nombreCompleto = z
  .string({ error: "Ingresá tu nombre y apellido." })
  .trim()
  .transform((valor) => valor.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Ingresá tu nombre y apellido, con al menos 2 letras.")
      .max(60, "El nombre puede tener hasta 60 caracteres."),
  )
  .refine(nombreSinDatosDeContacto, MENSAJE_CONTENIDO_PUBLICO);

export const whatsapp = z
  .string({ error: "Ingresá tu número de WhatsApp." })
  .trim()
  .min(1, "Ingresá tu número de WhatsApp.")
  .transform((valor, ctx) => {
    const e164 = normalizarTelefono(valor);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Revisá el número. Ej.: 223 555 1234" });
      return z.NEVER;
    }
    return e164;
  });

export const email = z
  .string({ error: "Ingresá tu email." })
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu email.")
  .max(254, "El email es demasiado largo.")
  .pipe(z.email({ error: "Revisá el email: parece que le falta algo." }));

const contrasena = z
  .string({ error: "Elegí una contraseña." })
  .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
  .max(72, "La contraseña puede tener hasta 72 caracteres.");

/** Id de barrio (smallint de la tabla `barrios`) que llega como texto del formulario. */
export const barrio = z
  .string({ error: "Elegí tu barrio." })
  .trim()
  .regex(/^[1-9]\d{0,4}$/, "Elegí tu barrio.")
  .transform(Number)
  .pipe(z.number().int().max(32767, "Elegí tu barrio."));

/** Registro de cliente con email: la misma validación corre en el navegador y en el servidor. */
export const esquemaRegistroCliente = z.object({
  nombreCompleto,
  whatsapp,
  email,
  contrasena,
  barrio,
});

/** Datos que faltan cuando entró con Google (o confirmó el email): solo WhatsApp y barrio. */
export const esquemaCompletarCliente = z.object({ whatsapp, barrio });

export const esquemaReenviar = z.object({ email });
