import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Solo para tests: lee src/app/globals.css y resuelve los tokens de color de cada tema hasta su
 * hex real (los alias son var(--color-…) y se siguen hasta un token con valor). Nunca se importa
 * desde la app.
 */

export const CSS_GLOBALS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

export type Tema = "claro" | "oscuro";

const SIN_COMENTARIOS = CSS_GLOBALS.replace(/\/\*[\s\S]*?\*\//g, "");
const BLOQUE = /([^{}]+)\{([^{}]*)\}/g;
const DECLARACION = /--color-([a-z-]+):\s*([^;]+);/g;

function declaraciones(filtro: (selectores: string[]) => boolean): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [, selector = "", cuerpo = ""] of SIN_COMENTARIOS.matchAll(BLOQUE)) {
    const selectores = selector
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!filtro(selectores)) continue;
    for (const [, nombre = "", valor = ""] of cuerpo.matchAll(DECLARACION)) {
      salida[nombre] = valor.trim();
    }
  }
  return salida;
}

const CLARO = declaraciones((s) => s.includes(":root") || s.includes(".claro"));
const OSCURO_SOLO = declaraciones((s) => s.includes(".dark"));

/** Declaraciones crudas de un tema: hex o var(--color-…). */
export function declaracionesDe(tema: Tema): Record<string, string> {
  return tema === "claro" ? CLARO : { ...CLARO, ...OSCURO_SOLO };
}

/** Hex en mayúsculas de un token en un tema, siguiendo los alias. */
export function hexDe(tema: Tema, nombre: string, profundidad = 0): string {
  const valor = declaracionesDe(tema)[nombre];
  if (!valor) throw new Error(`Falta --color-${nombre} en el tema ${tema}`);
  const alias = /^var\(--color-([a-z-]+)\)$/.exec(valor);
  if (alias?.[1]) {
    if (profundidad > 5) throw new Error(`Alias circular en --color-${nombre}`);
    return hexDe(tema, alias[1], profundidad + 1);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(valor)) throw new Error(`--color-${nombre} no es un hex: ${valor}`);
  return valor.toUpperCase();
}

/** rgb() con los mismos valores que un hex (para manifest y theme-color, que no admiten hex). */
export function rgbDe(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b})`;
}

/** rgb(r, g, b) con comas: el formato que devuelve getComputedStyle (para toHaveCSS). */
export function rgbComas(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Luminancia relativa WCAG 2.x. */
export function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG 2.x entre dos hex (1 a 21). */
export function contraste(a: string, b: string): number {
  const [claroL, oscuroL] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (claroL + 0.05) / (oscuroL + 0.05);
}
