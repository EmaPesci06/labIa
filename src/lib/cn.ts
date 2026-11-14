import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Tokens de color "Verano en la costa" (globals.css, sin el prefijo --color-). */
export const TOKENS_NUEVOS = [
  "fondo",
  "superficie",
  "texto",
  "accion",
  "sobre-accion",
  "encabezado",
  "sobre-encabezado",
  "sol",
  "sobre-sol",
  "coral",
  "error",
  "equipo",
  "velo",
  "foco",
] as const;

/**
 * Alias temporales de los nombres viejos. Apuntan a un token nuevo en globals.css; los borra LAB-69.
 * Listados en el PR de LAB-68.
 */
export const ALIAS_TEMPORALES = [
  "azul",
  "azul-presionado",
  "sobre-azul",
  "azul-suave",
  "sobre-azul-suave",
  "naranja-marca",
  "naranja-accion",
  "sobre-naranja",
  "naranja-suave",
  "sobre-naranja-suave",
  "exito",
  "sobre-exito",
  "exito-suave",
  "sobre-exito-suave",
  "acento",
  "superficie-elevada",
  "texto-secundario",
  "texto-terciario",
  "borde",
  "divisor",
  "cinta",
  "cinta-marcas",
] as const;

/** Todos los tokens de color que existen en globals.css. */
export const TOKENS_COLOR = [...TOKENS_NUEVOS, ...ALIAS_TEMPORALES] as const;

export type TokenColor = (typeof TOKENS_COLOR)[number];

// tailwind-merge tiene que conocer los tokens propios para no confundir, por ejemplo,
// `text-texto` (color) con `text-sm` (tamaño) o `font-titulo` (familia) con `font-bold` (peso).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [...TOKENS_COLOR],
      font: ["titulo", "texto", "mono"],
      radius: ["campo", "boton", "tarjeta", "hoja"],
    },
  },
});

/** Une clases condicionales y resuelve conflictos de Tailwind (la última gana). */
export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}
