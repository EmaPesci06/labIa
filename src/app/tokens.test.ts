import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ALIAS_TEMPORALES, TOKENS_COLOR, TOKENS_NUEVOS } from "@/lib/cn";
import { contraste, CSS_GLOBALS, hexDe } from "@/lib/tokens-css";

const RAIZ_SRC = join(__dirname, "..");

/** Valores de la tabla de tokens de docs/prototipo-nuevo/README.md. */
const CLARO_README = {
  fondo: "#FFF3D6",
  superficie: "#FFFFFF",
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

/** Qué token nuevo usa cada alias temporal (LAB-69 los borra). */
const ALIAS_A: Record<string, string> = {
  azul: "accion",
  "azul-presionado": "accion",
  "sobre-azul": "sobre-accion",
  "azul-suave": "superficie",
  "sobre-azul-suave": "texto",
  "naranja-marca": "coral",
  "naranja-accion": "accion",
  "sobre-naranja": "sobre-accion",
  "naranja-suave": "sol",
  "sobre-naranja-suave": "sobre-sol",
  exito: "accion",
  "sobre-exito": "sobre-accion",
  "exito-suave": "sol",
  "sobre-exito-suave": "sobre-sol",
  acento: "accion",
  "superficie-elevada": "superficie",
  "texto-secundario": "texto",
  "texto-terciario": "texto",
  borde: "texto",
  divisor: "fondo",
  cinta: "coral",
  "cinta-marcas": "texto",
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

  it("todos los tokens nuevos y los alias resuelven a un hex en los dos temas", () => {
    for (const nombre of TOKENS_COLOR) {
      expect(() => hexDe("claro", nombre), `claro ${nombre}`).not.toThrow();
      expect(() => hexDe("oscuro", nombre), `oscuro ${nombre}`).not.toThrow();
    }
  });

  it("cada token de TOKENS_COLOR está mapeado en el @theme de Tailwind", () => {
    for (const token of TOKENS_COLOR) {
      expect(CSS_GLOBALS, token).toContain(`--color-${token}: var(--color-${token});`);
    }
  });

  it("cada alias temporal apunta al token nuevo previsto", () => {
    expect(Object.keys(ALIAS_A).sort()).toEqual([...ALIAS_TEMPORALES].sort());
    for (const [alias, destino] of Object.entries(ALIAS_A)) {
      for (const tema of ["claro", "oscuro"] as const) {
        expect(hexDe(tema, alias), `${tema} ${alias}`).toBe(hexDe(tema, destino));
      }
    }
  });

  it("los nombres nuevos son los del README", () => {
    expect([...TOKENS_NUEVOS].sort()).toEqual(Object.keys(CLARO_README).sort());
  });
});

describe("contraste AA (≥ 4,5:1) de cada par texto/fondo, en claro y oscuro", () => {
  // [texto, fondo]: pares que la app usa para texto normal.
  const PARES: Array<[texto: string, fondo: string]> = [
    ["texto", "fondo"],
    ["texto", "superficie"],
    ["accion", "superficie"],
    ["sobre-accion", "accion"],
    ["sobre-encabezado", "encabezado"],
    ["sobre-encabezado", "equipo"],
    ["sobre-sol", "sol"],
    ["error", "fondo"],
    ["error", "superficie"],
  ];

  for (const tema of ["claro", "oscuro"] as const) {
    it.each(PARES)(`${tema}: %s sobre %s`, (texto, fondo) => {
      expect(contraste(hexDe(tema, texto), hexDe(tema, fondo))).toBeGreaterThanOrEqual(4.5);
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
});

describe("alias partido texto/fondo (LAB-68, lo borra LAB-69)", () => {
  // Los alias que caían en accion y se usan como texto (enlaces, mensajes) van a texto en
  // --text-color-*. El fondo (--color-*) sigue en accion.
  it.each(["azul", "azul-presionado", "naranja-accion", "exito", "acento"])(
    "text-%s va en texto y el color base sigue en accion",
    (alias) => {
      expect(CSS_GLOBALS).toContain(`--text-color-${alias}: var(--color-texto);`);
      for (const tema of ["claro", "oscuro"] as const) {
        expect(hexDe(tema, alias)).toBe(hexDe(tema, "accion"));
      }
    },
  );

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
