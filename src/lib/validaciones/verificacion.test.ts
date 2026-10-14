import { describe, expect, it } from "vitest";

import {
  esquemaDecision,
  esquemaVerificacionId,
  MAX_DOCUMENTOS_POR_CUENTA,
  MOTIVOS_RECHAZO,
  textoDelRechazo,
} from "./verificacion";

const ID = "7d3c1f2a-9b8e-4c6d-8a1f-2e3d4c5b6a79";

describe("esquemaDecision", () => {
  it("acepta aprobar sin motivo", () => {
    const r = esquemaDecision.safeParse({ verificacionId: ID, accion: "aprobar" });
    expect(r.success).toBe(true);
  });

  it("acepta rechazar con un motivo de la lista y sin detalle", () => {
    const r = esquemaDecision.safeParse({
      verificacionId: ID,
      accion: "rechazar",
      motivo: "Foto borrosa",
    });
    expect(r.success).toBe(true);
  });

  it("exige motivo al rechazar", () => {
    const r = esquemaDecision.safeParse({ verificacionId: ID, accion: "rechazar" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["motivo"]);
      expect(r.error.issues[0]?.message).toBe("Elegí un motivo para el rechazo.");
    }
  });

  it("rechaza un motivo que no está en la lista", () => {
    const r = esquemaDecision.safeParse({
      verificacionId: ID,
      accion: "rechazar",
      motivo: "Motivo inventado",
    });
    expect(r.success).toBe(false);
  });

  it("con el motivo Otro exige el texto", () => {
    const sinTexto = esquemaDecision.safeParse({
      verificacionId: ID,
      accion: "rechazar",
      motivo: "Otro",
      detalle: "   ",
    });
    expect(sinTexto.success).toBe(false);
    if (!sinTexto.success) expect(sinTexto.error.issues[0]?.path).toEqual(["detalle"]);

    const conTexto = esquemaDecision.safeParse({
      verificacionId: ID,
      accion: "rechazar",
      motivo: "Otro",
      detalle: "Está recortado a la mitad",
    });
    expect(conTexto.success).toBe(true);
  });

  it("limita el detalle a 300 caracteres", () => {
    const r = esquemaDecision.safeParse({
      verificacionId: ID,
      accion: "rechazar",
      motivo: "Otro",
      detalle: "a".repeat(301),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una acción distinta de aprobar o rechazar", () => {
    const r = esquemaDecision.safeParse({ verificacionId: ID, accion: "borrar" });
    expect(r.success).toBe(false);
  });

  it("rechaza un id que no es uuid", () => {
    expect(esquemaDecision.safeParse({ verificacionId: "x", accion: "aprobar" }).success).toBe(
      false,
    );
    expect(esquemaVerificacionId.safeParse({ verificacionId: "x" }).success).toBe(false);
  });
});

describe("textoDelRechazo", () => {
  it("arma el motivo con el detalle", () => {
    expect(textoDelRechazo("Otro", " Recortado ")).toBe("Otro: Recortado");
  });

  it("sin detalle queda solo el motivo", () => {
    expect(textoDelRechazo("Foto borrosa")).toBe("Foto borrosa");
    expect(textoDelRechazo("Foto borrosa", "   ")).toBe("Foto borrosa");
  });

  it("nunca pasa de 500 caracteres (límite de motivo_rechazo)", () => {
    expect(textoDelRechazo("Otro", "b".repeat(400)).length).toBeLessThanOrEqual(500);
  });
});

describe("constantes del panel", () => {
  it("la cuota por cuenta es 12 y la lista de motivos tiene 6 opciones", () => {
    expect(MAX_DOCUMENTOS_POR_CUENTA).toBe(12);
    expect(MOTIVOS_RECHAZO).toHaveLength(6);
    expect(MOTIVOS_RECHAZO).toContain("Otro");
  });
});
