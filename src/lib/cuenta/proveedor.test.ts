import { describe, expect, it } from "vitest";

import { ingresoReciente, tieneContrasena } from "./proveedor";

describe("tieneContrasena", () => {
  it("detecta email y contraseña", () => {
    expect(tieneContrasena({ identities: [{ provider: "email" }] })).toBe(true);
    expect(tieneContrasena({ app_metadata: { providers: ["google", "email"] } })).toBe(true);
    expect(tieneContrasena({ app_metadata: { provider: "email" } })).toBe(true);
  });
  it("una cuenta solo de Google no tiene contraseña", () => {
    expect(
      tieneContrasena({
        identities: [{ provider: "google" }],
        app_metadata: { provider: "google", providers: ["google"] },
      }),
    ).toBe(false);
  });
});

describe("ingresoReciente", () => {
  const ahora = new Date("2026-10-14T12:00:00Z");
  it("acepta un ingreso de hace pocos minutos", () => {
    expect(ingresoReciente({ last_sign_in_at: "2026-10-14T11:55:00Z" }, ahora)).toBe(true);
  });
  it("rechaza uno viejo o sin fecha", () => {
    expect(ingresoReciente({ last_sign_in_at: "2026-10-14T11:00:00Z" }, ahora)).toBe(false);
    expect(ingresoReciente({}, ahora)).toBe(false);
  });
});
