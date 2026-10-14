import { describe, expect, it } from "vitest";

import { formatearBajadaTrabajos } from "./formato";

describe("formatearBajadaTrabajos", () => {
  it("combina oficios y zonas", () => {
    const bajada = formatearBajadaTrabajos(["gas", "plomeria"], ["La Perla", "Centro"], false);
    expect(bajada).toBe("Gas, Plomería · La Perla, Centro");
  });

  it("muestra 'Toda la ciudad' si todaLaCiudad es true", () => {
    const bajada = formatearBajadaTrabajos(["plomeria"], ["La Perla"], true);
    expect(bajada).toBe("Plomería · Toda la ciudad");
  });

  it("usa 'Mar del Plata' si no hay zonas especificadas", () => {
    const bajada = formatearBajadaTrabajos(["electricidad"], [], false);
    expect(bajada).toBe("Electricidad · Mar del Plata");
  });
});
