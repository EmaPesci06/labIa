import { describe, expect, it } from "vitest";

import { VERSION_LEGALES } from "@/lib/legales";
import {
  esquemaConsentimientoDatosSensibles,
  leerConsentimiento,
  MENSAJE_CONSENTIMIENTO,
} from "@/lib/validaciones/consentimiento";

const formulario = (campos: Record<string, string>) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
};

describe("esquemaConsentimientoDatosSensibles", () => {
  it("acepta la casilla tildada con la versión vigente", () => {
    const r = esquemaConsentimientoDatosSensibles.safeParse(
      leerConsentimiento(formulario({ consiento: "on", version: VERSION_LEGALES })),
    );
    expect(r.success).toBe(true);
  });

  it("rechaza sin tildar, con el mensaje en castellano", () => {
    const r = esquemaConsentimientoDatosSensibles.safeParse(
      leerConsentimiento(formulario({ version: VERSION_LEGALES })),
    );
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(MENSAJE_CONSENTIMIENTO);
  });

  it("rechaza una versión vieja o inventada", () => {
    const r = esquemaConsentimientoDatosSensibles.safeParse(
      leerConsentimiento(formulario({ consiento: "on", version: "1999-01" })),
    );
    expect(r.success).toBe(false);
  });
});
