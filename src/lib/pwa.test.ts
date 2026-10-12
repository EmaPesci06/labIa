import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

import { PWA_COLORES } from "./pwa";

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

function rgbDe(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b})`;
}

/** Valor de --color-<token> dentro del bloque que empieza con `selector {`. */
function token(selector: string, nombre: string): string {
  const inicio = css.indexOf(`\n${selector} {`);
  const bloque = css.slice(inicio, css.indexOf("}", inicio));
  const valor = new RegExp(`--color-${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(bloque)?.[1];
  if (!valor) throw new Error(`Falta --color-${nombre} en ${selector}`);
  return valor;
}

describe("colores de la PWA", () => {
  it("coinciden con los tokens de globals.css", () => {
    expect(PWA_COLORES.fondoClaro).toBe(rgbDe(token(":root,\n.claro", "fondo")));
    expect(PWA_COLORES.fondoOscuro).toBe(rgbDe(token(".dark", "fondo")));
    expect(PWA_COLORES.azul).toBe(rgbDe(token(":root,\n.claro", "azul")));
  });
});

describe("manifest", () => {
  const m = manifest();

  it("es la app LabÍA, instalable y en español", () => {
    expect(m).toMatchObject({
      name: "LabÍA",
      short_name: "LabÍA",
      lang: "es-AR",
      start_url: "/inicio",
      display: "standalone",
    });
  });

  it("usa los colores de los tokens", () => {
    expect(m.background_color).toBe(PWA_COLORES.fondoClaro);
    expect(m.theme_color).toBe(PWA_COLORES.azul);
  });

  it("tiene íconos de 192 y 512 px y uno maskable", () => {
    const iconos = m.icons ?? [];
    expect(iconos.some((i) => i.sizes === "192x192")).toBe(true);
    expect(iconos.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(iconos.some((i) => i.purpose === "maskable")).toBe(true);
  });
});
