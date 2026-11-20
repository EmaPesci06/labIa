import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TOKENS_COLOR } from "@/lib/cn";
import { contraste, CSS_GLOBALS, hexDe } from "@/lib/tokens-css";

const RAIZ_SRC = join(__dirname, "..");

/** Valores de la tabla de tokens de docs/prototipo-nuevo/README.md. `campo` no está en la tabla. */
const CLARO_README = {
  fondo: "#FFF3D6",
  superficie: "#FFFFFF",
  campo: "#FFFFFF",
  texto: "#123B4A",
  accion: "#0E7C86",
  "sobre-accion": "#FFFFFF",
  encabezado: "#0E7C86",
  "sobre-encabezado": "#FFFFFF",
  sol: "#F7C948",
  "sobre-sol": "#123B4A",
  coral: "#F25C54",
  error: "#A62B24",
  equipo: "#123B4A",
  velo: "#123B4A",
  foco: "#123B4A",
};

const OSCURO_README = {
  fondo: "#0B2730",
  superficie: "#17485A",
  campo: "#0B2730",
  texto: "#FFF3D6",
  accion: "#45C4CC",
  "sobre-accion": "#0B2730",
  encabezado: "#0E7C86",
  "sobre-encabezado": "#FFFFFF",
  sol: "#F7C948",
  "sobre-sol": "#123B4A",
  coral: "#F25C54",
  error: "#FF9A8F",
  equipo: "#17485A",
  velo: "#05161B",
  foco: "#F7C948",
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

  it("los nombres de TOKENS_COLOR son los del README más campo, borde y texto-suave", () => {
    expect([...TOKENS_COLOR].sort()).toEqual(
      [...Object.keys(CLARO_README), "borde", "texto-suave"].sort(),
    );
  });

  it("borde y texto-suave tienen el hex pensado en cada tema", () => {
    expect(hexDe("claro", "texto-suave")).toBe("#48646F");
    expect(hexDe("claro", "borde")).toBe("#6F8790");
    expect(hexDe("oscuro", "texto-suave")).toBe("#C4D6D8");
    expect(hexDe("oscuro", "borde")).toBe("#7AA3AE");
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
      "exito",
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
    ["sobre-sol", "sol"],
    ["error", "fondo"],
    ["error", "superficie"],
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

  // Pares que NO se usan para texto y no se exigen AA (se documentan con su número real):
  // - coral: solo adorno (toldos). Nunca texto.
  // - accion sobre fondo en claro: 4,49:1, queda a 0,01 de AA. Sirve para íconos, enlaces grandes
  //   o acentos; para texto chico usar texto o superficie.
  it("accion claro sobre fondo queda en 4,49:1 (no usar para texto chico)", () => {
    expect(contraste(hexDe("claro", "accion"), hexDe("claro", "fondo"))).toBeCloseTo(4.49, 2);
  });

  it("coral sobre fondo y superficie no llega a AA: solo adorno, nunca texto", () => {
    expect(contraste(hexDe("claro", "coral"), hexDe("claro", "fondo"))).toBeLessThan(4.5);
    expect(contraste(hexDe("claro", "coral"), hexDe("claro", "superficie"))).toBeLessThan(4.5);
  });

  it("la fórmula da los valores conocidos", () => {
    expect(contraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    // Blanco sobre turquesa de encabezado: 4,95:1, apto para texto normal.
    expect(contraste("#FFFFFF", "#0E7C86")).toBeCloseTo(4.95, 1);
  });

  it("el texto de los enlaces (texto) pasa AA sobre el fondo arena y la superficie", () => {
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
