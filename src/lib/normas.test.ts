import { describe, expect, it } from "vitest";

import {
  destinoParaAceptarNormas,
  NORMAS,
  normasAlDia,
  RUTA_NORMAS_REGISTRO,
  RUTA_REACEPTAR_NORMAS,
  VERSION_NORMAS,
} from "./normas";

describe("normas", () => {
  it("son diez compromisos", () => {
    expect(NORMAS).toHaveLength(10);
    expect(NORMAS[0]).toBe("Usar tu identidad real y presentar tu certificado de antecedentes.");
    expect(NORMAS[9]).toBe("Usar la dirección y el teléfono del cliente solo para ese trabajo.");
  });

  it("está al día solo con la versión vigente", () => {
    expect(normasAlDia(VERSION_NORMAS)).toBe(true);
    expect(normasAlDia(null)).toBe(false);
    expect(normasAlDia("2026-01")).toBe(false);
  });

  it("al cambiar la versión pide aceptar de nuevo", () => {
    expect(destinoParaAceptarNormas("profesional", "2026-10", "2026-10")).toBeNull();
    expect(destinoParaAceptarNormas("profesional", "2026-10", "2027-02")).toBe(
      RUTA_REACEPTAR_NORMAS,
    );
  });

  it("sin aceptación previa sigue el registro", () => {
    expect(destinoParaAceptarNormas("profesional", null)).toBe(RUTA_NORMAS_REGISTRO);
  });

  it("no aplica a clientes ni admins", () => {
    expect(destinoParaAceptarNormas("cliente", null)).toBeNull();
    expect(destinoParaAceptarNormas("admin", "vieja")).toBeNull();
  });
});
