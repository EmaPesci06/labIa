import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { trabajoLeSirve } from "./resumenes";

describe("trabajoLeSirve", () => {
  const trabajo = { oficio: "plomeria", barrio_id: 7 };

  it("exige el oficio", () => {
    expect(trabajoLeSirve(trabajo, { oficios: ["gas"], toda_la_ciudad: true, zonas: [] })).toBe(
      false,
    );
  });
  it("acepta toda la ciudad", () => {
    expect(
      trabajoLeSirve(trabajo, { oficios: ["plomeria"], toda_la_ciudad: true, zonas: [] }),
    ).toBe(true);
  });
  it("o el barrio dentro de sus zonas", () => {
    const perfil = { oficios: ["plomeria"], toda_la_ciudad: false, zonas: [3, 7] };
    expect(trabajoLeSirve(trabajo, perfil)).toBe(true);
    expect(trabajoLeSirve({ ...trabajo, barrio_id: 9 }, perfil)).toBe(false);
  });
});
