import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { tieneDatosDeContacto } from "./contenido-publico";

// Los casos viven en el pgTAP de la base (supabase/tests/database/contenido_publico.test.sql). Este test
// los lee y los corre contra el helper de la app: si las dos implementaciones se separan, falla.
const ARCHIVO_SQL = resolve(process.cwd(), "supabase/tests/database/contenido_publico.test.sql");
const FILA = /^\s*\('((?:[^']|'')*)',\s*(true|false)\)[,;]?\s*$/;

function leerCasos(): Array<[texto: string, bloquea: boolean]> {
  return readFileSync(ARCHIVO_SQL, "utf8")
    .split("\n")
    .flatMap((linea) => {
      const fila = FILA.exec(linea);
      if (!fila) return [];
      return [[(fila[1] ?? "").replace(/''/g, "'"), fila[2] === "true"] as [string, boolean]];
    });
}

describe("paridad con privado.tiene_dato_de_contacto (SQL)", () => {
  const casos = leerCasos();

  it("lee los casos del pgTAP", () => {
    expect(casos.length).toBeGreaterThanOrEqual(40);
  });

  it.each(casos)("«%s» → bloquea %s, igual que en la base", (texto, bloquea) => {
    expect(tieneDatosDeContacto(texto)).toBe(bloquea);
  });
});
