import { describe, expect, it } from "vitest";

import { legalesRevisados, MARCADORES } from "@/lib/legales";

describe("legalesRevisados", () => {
  it("es falso sin variable o con cualquier otro valor", () => {
    expect(legalesRevisados(undefined)).toBe(false);
    expect(legalesRevisados("")).toBe(false);
    expect(legalesRevisados("1")).toBe(false);
    expect(legalesRevisados("false")).toBe(false);
  });

  it("es verdadero solo con 'true'", () => {
    expect(legalesRevisados("true")).toBe(true);
  });
});

describe("MARCADORES", () => {
  it("van entre corchetes para que sea fácil encontrarlos", () => {
    for (const valor of Object.values(MARCADORES)) expect(valor).toMatch(/^\[[^\]]+\]$/);
  });
});
