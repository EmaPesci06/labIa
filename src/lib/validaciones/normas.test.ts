import { describe, expect, it } from "vitest";

import { VERSION_NORMAS } from "@/lib/normas";

import { esquemaAceptarNormas, MENSAJE_ACEPTAR_NORMAS } from "./normas";

describe("esquemaAceptarNormas", () => {
  it("acepta la casilla tildada con la versión vigente", () => {
    expect(esquemaAceptarNormas.safeParse({ acepto: "on", version: VERSION_NORMAS }).success).toBe(
      true,
    );
  });

  it("rechaza sin tildar", () => {
    const r = esquemaAceptarNormas.safeParse({ acepto: null, version: VERSION_NORMAS });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(MENSAJE_ACEPTAR_NORMAS);
  });

  it("rechaza una versión vieja", () => {
    expect(esquemaAceptarNormas.safeParse({ acepto: "on", version: "2020-01" }).success).toBe(
      false,
    );
  });
});
