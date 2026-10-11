import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Nombres de los tokens de color de globals.css (sin el prefijo --color-). */
export const TOKENS_COLOR = [
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
  "fondo",
  "superficie",
  "superficie-elevada",
  "texto",
  "texto-secundario",
  "texto-terciario",
  "borde",
  "divisor",
  "foco",
  "cinta",
  "cinta-marcas",
] as const;

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
