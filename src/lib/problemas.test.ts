import { describe, expect, it } from "vitest";

import { OFICIOS } from "./busqueda";
import { OFICIOS_ORDENADOS } from "./oficios";
import { PROBLEMA_POR_DEFECTO, PROBLEMAS, problemaPorSlug, TITULO_RESULTADO } from "./problemas";

describe("problemas del inicio", () => {
  it("cada problema lleva a un oficio que existe y los slugs no se repiten", () => {
    const slugs = PROBLEMAS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const problema of PROBLEMAS) {
      expect(OFICIOS).toContain(problema.oficio);
    }
  });

  it("el problema por defecto es el primero del boceto (canilla, plomería)", () => {
    expect(PROBLEMA_POR_DEFECTO.slug).toBe("pierde-canilla");
    expect(PROBLEMA_POR_DEFECTO.oficio).toBe("plomeria");
  });

  it("busca por slug y devuelve undefined si no existe", () => {
    expect(problemaPorSlug("olor-a-gas")?.oficio).toBe("gas");
    expect(problemaPorSlug("no-existe")).toBeUndefined();
    expect(problemaPorSlug(undefined)).toBeUndefined();
  });

  it("cada oficio de la grilla tiene su título de resultado", () => {
    for (const oficio of OFICIOS_ORDENADOS) {
      expect(TITULO_RESULTADO[oficio]).toMatch(/^Eso lo arregla /);
    }
  });
});
