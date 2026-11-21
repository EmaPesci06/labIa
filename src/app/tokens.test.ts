import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TOKENS_COLOR } from "@/lib/cn";
import { contraste, CSS_GLOBALS, hexDe } from "@/lib/tokens-css";

const RAIZ_SRC = join(__dirname, "..");

/** Valores aprobados en LAB-90 (Papelería sellada). `campo` y `exito` completan la tabla. */
const CLARO_README = {
  fondo: "#EAF0EE",
  superficie: "#FFFFFF",
  campo: "#FFFFFF",
  texto: "#16231F",
  accion: "#B8441B",
  "sobre-accion": "#FFFFFF",
  encabezado: "#16231F",
  "sobre-encabezado": "#EAF0EE",
  destacado: "#16231F",
  "sobre-destacado": "#EAF0EE",
  adorno: "#E0592A",
  exito: "#1F7A4A",
  error: "#B3261E",
  equipo: "#16231F",
  velo: "#16231F",
  foco: "#16231F",
};

const OSCURO_README = {
  fondo: "#0F1A17",
  superficie: "#1A2925",
  campo: "#0F1A17",
  texto: "#E6EEEB",
  accion: "#F07A4A",
  "sobre-accion": "#0F1A17",
  encabezado: "#1A2925",
  "sobre-encabezado": "#E6EEEB",
  destacado: "#E6EEEB",
  "sobre-destacado": "#0F1A17",
  adorno: "#E0592A",
  exito: "#5CC48A",
  error: "#FF8A80",
  equipo: "#2C3D38",
  velo: "#050A09",
  foco: "#F07A4A",
};

describe("tokens de la paleta nueva", () => {
  it("el modo claro tiene los hex del README", () => {
    for (const [nombre, hex] of Object.entries(CLARO_README)) {
      expect(hexDe("claro", nombre), nombre).toBe(hex);
    }
  });

  it("el modo oscuro tiene los hex del README", () => {
    for (const [nombre, hex] of Object.entries(OSCURO_README)) {
      expect(hexDe("oscuro", nombre), nombre).toBe(hex);
    }
  });

  it("todos los tokens resuelven a un hex en los dos temas", () => {
    for (const nombre of TOKENS_COLOR) {
      expect(() => hexDe("claro", nombre), `claro ${nombre}`).not.toThrow();
      expect(() => hexDe("oscuro", nombre), `oscuro ${nombre}`).not.toThrow();
    }
  });

  it("los nombres de TOKENS_COLOR son los de LAB-90 más borde y texto-suave", () => {
    expect([...TOKENS_COLOR].sort()).toEqual(
      [...Object.keys(CLARO_README), "borde", "texto-suave"].sort(),
    );
  });

  it("borde y texto-suave tienen el hex pensado en cada tema", () => {
    expect(hexDe("claro", "texto-suave")).toBe("#47564F");
    expect(hexDe("claro", "borde")).toBe("#6B7F78");
    expect(hexDe("oscuro", "texto-suave")).toBe("#A7B8B1");
    expect(hexDe("oscuro", "borde")).toBe("#6F8A80");
  });

  it("cada token de TOKENS_COLOR está mapeado en el @theme de Tailwind", () => {
    for (const token of TOKENS_COLOR) {
      expect(CSS_GLOBALS, token).toContain(`--color-${token}: var(--color-${token});`);
    }
  });

  it("no quedan alias de nombres viejos en globals.css", () => {
    const viejos = [
      "azul",
      "naranja",
      "acento",
      "superficie-elevada",
      "texto-secundario",
      "texto-terciario",
      "divisor",
      "cinta",
    ];
    for (const viejo of viejos) {
      expect(CSS_GLOBALS, viejo).not.toMatch(new RegExp(`--(color|text-color)-${viejo}\\b`));
    }
    expect(CSS_GLOBALS).not.toContain("--font-mono");
    expect(CSS_GLOBALS).not.toContain("--text-color-");
  });
});

describe("contraste AA (≥ 4,5:1) de cada par texto/fondo, en claro y oscuro", () => {
  // [texto, fondo]: pares que la app usa para texto normal.
  const PARES: Array<[texto: string, fondo: string]> = [
    ["texto", "fondo"],
    ["texto", "superficie"],
    ["texto", "campo"],
    ["sobre-accion", "accion"],
    ["sobre-encabezado", "encabezado"],
    ["sobre-encabezado", "equipo"],
    ["sobre-destacado", "destacado"],
    ["error", "fondo"],
    ["error", "superficie"],
    ["exito", "fondo"],
    ["exito", "superficie"],
    ["accion", "fondo"],
    ["accion", "superficie"],
    ["texto-suave", "fondo"],
    ["texto-suave", "superficie"],
    ["texto-suave", "campo"],
  ];

  for (const tema of ["claro", "oscuro"] as const) {
    it.each(PARES)(`${tema}: %s sobre %s`, (texto, fondo) => {
      expect(contraste(hexDe(tema, texto), hexDe(tema, fondo))).toBeGreaterThanOrEqual(4.5);
    });
  }

  // borde es un componente de interfaz (bordes de campos y tarjetas): WCAG 1.4.11 pide 3:1.
  for (const tema of ["claro", "oscuro"] as const) {
    it.each(["fondo", "superficie", "campo"])(`${tema}: borde sobre %s llega a 3:1`, (fondo) => {
      expect(contraste(hexDe(tema, "borde"), hexDe(tema, fondo))).toBeGreaterThanOrEqual(3);
    });
  }

  // Pares que NO se usan para texto y no se exigen AA:
  // - adorno: el sello y los motivos. Nunca texto.
  it("adorno sobre fondo y superficie no llega a AA: solo adorno, nunca texto", () => {
    expect(contraste(hexDe("claro", "adorno"), hexDe("claro", "fondo"))).toBeLessThan(4.5);
    expect(contraste(hexDe("claro", "adorno"), hexDe("claro", "superficie"))).toBeLessThan(4.5);
  });

  // Foco y bordes de los controles: componentes de interfaz, 3:1 (WCAG 1.4.11).
  for (const tema of ["claro", "oscuro"] as const) {
    it.each(["fondo", "superficie"])(`${tema}: foco sobre %s llega a 3:1`, (fondo) => {
      expect(contraste(hexDe(tema, "foco"), hexDe(tema, fondo))).toBeGreaterThanOrEqual(3);
    });
  }

  it("la fórmula da los valores conocidos", () => {
    expect(contraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    // Blanco sobre el naranja de acción en claro: 5,4:1 (LAB-90).
    expect(contraste("#FFFFFF", "#B8441B")).toBeCloseTo(5.4, 1);
  });

  it("el texto pasa AA sobre el fondo y la superficie", () => {
    expect(contraste(hexDe("claro", "texto"), hexDe("claro", "fondo"))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(hexDe("claro", "texto"), hexDe("claro", "superficie"))).toBeGreaterThanOrEqual(
      4.5,
    );
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
