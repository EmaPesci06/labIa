import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TOKENS_COLOR } from "@/lib/cn";

const RAIZ_SRC = join(__dirname, "..");
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

/** Variables --color-* de un bloque de globals.css cuyo selector empieza exactamente así. */
function variablesDe(selector: string): Record<string, string> {
  const inicio = css.indexOf(`\n${selector} {`);
  if (inicio === -1) throw new Error(`No encontré el bloque ${selector} en globals.css`);
  const fin = css.indexOf("}", inicio);
  const bloque = css.slice(inicio, fin);
  const variables: Record<string, string> = {};
  for (const [, nombre, valor] of bloque.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    if (nombre && valor) variables[nombre] = valor.toUpperCase();
  }
  return variables;
}

const claro = variablesDe(":root,\n.claro");
// En oscuro, lo que no se redefine se hereda del claro (foco, cinta…).
const oscuro = { ...claro, ...variablesDe(".dark") };

function valor(tema: Record<string, string>, token: string): string {
  const hex = tema[token];
  if (!hex) throw new Error(`Falta el token ${token}`);
  return hex;
}

// --- Contraste WCAG 2.x ---
function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claroL, oscuroL] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (claroL + 0.05) / (oscuroL + 0.05);
}

describe("tokens de la guía §5", () => {
  it("el modo claro tiene los hex exactos de la guía", () => {
    expect(claro).toMatchObject({
      azul: "#232F49",
      "azul-presionado": "#182136",
      "azul-suave": "#E6E9F0",
      "naranja-marca": "#D45F3A",
      "naranja-accion": "#B84A25",
      "naranja-suave": "#FBE5DC",
      "sobre-naranja-suave": "#9A3A17",
      fondo: "#F1F3F6",
      superficie: "#FFFFFF",
      texto: "#1B2438",
      "texto-secundario": "#4B5468",
      "texto-terciario": "#5E6678",
      borde: "#CDD2DB",
      divisor: "#DDE0E6",
      exito: "#1D6B45",
      "exito-suave": "#DCEFE4",
      "sobre-exito-suave": "#14532D",
      "sobre-azul": "#FFFFFF",
      "sobre-naranja": "#FFFFFF",
      "sobre-exito": "#FFFFFF",
      foco: "#D45F3A",
      cinta: "#D45F3A",
      "cinta-marcas": "#232F49",
    });
  });

  it("el modo oscuro tiene los hex exactos de la guía", () => {
    expect(oscuro).toMatchObject({
      fondo: "#121826",
      superficie: "#1B2335",
      "superficie-elevada": "#243049",
      borde: "#334060",
      texto: "#EEF0F5",
      "texto-secundario": "#A9B2C6",
      "texto-terciario": "#8D97AD",
      azul: "#B7C5E8",
      "sobre-azul": "#121826",
      "naranja-accion": "#E8714B",
      "sobre-naranja": "#121826",
      acento: "#F2A07F",
      "azul-suave": "#2A3550",
      "sobre-azul-suave": "#C9D4EE",
      "naranja-suave": "#3A241B",
      "sobre-naranja-suave": "#F4B399",
      exito: "#4CC38A",
      "sobre-exito": "#121826",
      "exito-suave": "#16362A",
      "sobre-exito-suave": "#6FD3A0",
      // La cinta y el foco no cambian con el tema.
      foco: "#D45F3A",
      cinta: "#D45F3A",
      "cinta-marcas": "#232F49",
    });
  });

  it("todos los tokens de TOKENS_COLOR existen en los dos temas y en el @theme de Tailwind", () => {
    for (const token of TOKENS_COLOR) {
      expect(claro, token).toHaveProperty([token]);
      expect(oscuro, token).toHaveProperty([token]);
      expect(css).toContain(`--color-${token}: var(--color-${token});`);
    }
  });
});

describe("contraste AA (≥ 4,5:1) de los pares texto/fondo principales", () => {
  const PARES: Array<[texto: string, fondo: string]> = [
    ["texto", "fondo"],
    ["texto", "superficie"],
    ["texto", "superficie-elevada"],
    ["texto-secundario", "fondo"],
    ["texto-secundario", "superficie"],
    ["texto-terciario", "fondo"],
    ["texto-terciario", "superficie"],
    ["sobre-azul", "azul"],
    ["sobre-naranja", "naranja-accion"],
    ["sobre-exito", "exito"],
    ["sobre-azul-suave", "azul-suave"],
    ["sobre-naranja-suave", "naranja-suave"],
    ["sobre-exito-suave", "exito-suave"],
    ["acento", "superficie"],
    ["acento", "fondo"],
    ["error", "superficie"],
    ["error", "fondo"],
  ];

  for (const [nombreTema, tema] of [
    ["claro", claro],
    ["oscuro", oscuro],
  ] as const) {
    it.each(PARES)(`${nombreTema}: %s sobre %s`, (texto, fondo) => {
      expect(contraste(valor(tema, texto), valor(tema, fondo))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("la fórmula da los valores conocidos", () => {
    expect(contraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    // La guía cita 5,19:1 para blanco sobre naranja-accion.
    expect(contraste("#FFFFFF", "#B84A25")).toBeCloseTo(5.19, 1);
  });
});

describe("sin hex sueltos", () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nombre) => {
      const ruta = join(dir, nombre);
      return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
    });
  }

  it("ningún .tsx ni .ts de src (salvo tests) tiene colores en hex", () => {
    const conHex = archivos(RAIZ_SRC)
      .filter((ruta) => /\.tsx?$/.test(ruta) && !/\.test\.tsx?$/.test(ruta))
      // Los emails no pueden usar variables CSS (los clientes de correo no las soportan): sus
      // colores de marca viven en un solo archivo.
      .filter((ruta) => !/[\\/]lib[\\/]emails[\\/]Layout\.tsx$/.test(ruta))
      .filter((ruta) => /#[0-9A-Fa-f]{6}\b/.test(readFileSync(ruta, "utf8")));
    expect(conHex).toEqual([]);
  });
});
