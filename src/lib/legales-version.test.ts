import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { VERSION_LEGALES } from "@/lib/legales";

// LAB-43: la versión vigente está en dos lugares (SQL y TypeScript). Este test impide que diverjan.
// Vitest corre desde la raíz del repo (el entorno jsdom no expone rutas file:// de import.meta).
const MIGRACIONES = join(process.cwd(), "supabase", "migrations");

describe("versión vigente de la política de datos sensibles", () => {
  it("la migración más nueva que la define tiene el mismo literal que VERSION_LEGALES", () => {
    const archivos = readdirSync(MIGRACIONES)
      .filter((nombre) => nombre.endsWith(".sql"))
      .sort()
      .reverse();
    const definicion = archivos
      .map((nombre) => readFileSync(join(MIGRACIONES, nombre), "utf8"))
      .find((contenido) => contenido.includes("function privado.version_legales_vigente()"));

    expect(definicion, "falta privado.version_legales_vigente() en las migraciones").toBeDefined();
    const literal = /function privado\.version_legales_vigente\(\)[\s\S]*?select\s+'([^']+)'/.exec(
      definicion ?? "",
    )?.[1];
    expect(literal).toBe(VERSION_LEGALES);
  });
});
