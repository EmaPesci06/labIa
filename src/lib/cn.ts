import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Tokens de color "Verano en la costa" (globals.css, sin el prefijo --color-). */
export const TOKENS_COLOR = [
  "fondo",
  "superficie",
  "campo",
  "texto",
  "texto-suave",
  "borde",
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

export type TokenColor = (typeof TOKENS_COLOR)[number];

// tailwind-merge tiene que conocer los tokens propios para no confundir, por ejemplo,
// `text-texto` (color) con `text-sm` (tamaño) o `font-titulo` (familia) con `font-bold` (peso).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [...TOKENS_COLOR],
      font: ["titulo", "texto"],
      radius: ["campo", "boton", "tarjeta", "hoja"],
    },
  },
});

/** Une clases condicionales y resuelve conflictos de Tailwind (la última gana). */
export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}
