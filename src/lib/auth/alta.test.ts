import { describe, expect, it } from "vitest";

import { altaIncompleta } from "./alta";

describe("altaIncompleta", () => {
  it("el cliente que no aceptó los términos tiene el alta incompleta", () => {
    expect(altaIncompleta({ rol: "cliente", terminosAceptados: false })).toBe(true);
  });

  it("el cliente que los aceptó no", () => {
    expect(altaIncompleta({ rol: "cliente", terminosAceptados: true })).toBe(false);
  });

  it("profesional y admin no usan esta casilla", () => {
    expect(altaIncompleta({ rol: "profesional", terminosAceptados: false })).toBe(false);
    expect(altaIncompleta({ rol: "admin", terminosAceptados: false })).toBe(false);
  });
});
