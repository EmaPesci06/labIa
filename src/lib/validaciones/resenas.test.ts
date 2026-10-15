import { describe, expect, it } from "vitest";

import {
  CHIPS_RAPIDOS,
  ETIQUETAS_PUNTAJE,
  esquemaGuardarResena,
  MENSAJE_CONTACTO_RESENA,
  MENSAJE_PUNTAJE_INVALIDO,
  MENSAJE_TEXTO_LARGO,
} from "./resenas";

const PROFESIONAL_VALIDO = "cccccccc-1200-4000-a000-000000000004";
const TRABAJO_VALIDO = "88888888-8888-4888-8888-888888888881";

describe("esquemaGuardarResena", () => {
  it("acepta una reseña válida con puntaje y texto", () => {
    const res = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 5,
      texto: "Excelente profesional, muy puntual y prolijo.",
      trabajoId: TRABAJO_VALIDO,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.puntaje).toBe(5);
      expect(res.data.texto).toBe("Excelente profesional, muy puntual y prolijo.");
      expect(res.data.trabajoId).toBe(TRABAJO_VALIDO);
    }
  });

  it("acepta una reseña sin texto y sin trabajoId", () => {
    const res = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 4,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.texto).toBeNull();
      expect(res.data.trabajoId).toBeNull();
    }
  });

  it("normaliza texto vacío o solo espacios a null", () => {
    const res = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 3,
      texto: "   ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.texto).toBeNull();
    }
  });

  it("rechaza puntaje menor a 1 o mayor a 5", () => {
    const bajo = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 0,
    });
    expect(bajo.success).toBe(false);
    if (!bajo.success) {
      expect(bajo.error.issues[0]?.message).toBe(MENSAJE_PUNTAJE_INVALIDO);
    }

    const alto = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 6,
    });
    expect(alto.success).toBe(false);
    if (!alto.success) {
      expect(alto.error.issues[0]?.message).toBe(MENSAJE_PUNTAJE_INVALIDO);
    }
  });

  it("rechaza números no enteros en el puntaje", () => {
    const decimal = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 4.5,
    });
    expect(decimal.success).toBe(false);
    if (!decimal.success) {
      expect(decimal.error.issues[0]?.message).toBe(MENSAJE_PUNTAJE_INVALIDO);
    }
  });

  it("rechaza textos mayores a 500 caracteres", () => {
    const largo = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 5,
      texto: "a".repeat(501),
    });
    expect(largo.success).toBe(false);
    if (!largo.success) {
      expect(largo.error.issues[0]?.message).toBe(MENSAJE_TEXTO_LARGO);
    }
  });

  it("filtro anti-spam: rechaza números de teléfono en el texto", () => {
    const conTelefono1 = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 5,
      texto: "Llamame al 223 555-1234 para coordinar",
    });
    expect(conTelefono1.success).toBe(false);
    if (!conTelefono1.success) {
      expect(conTelefono1.error.issues[0]?.message).toBe(MENSAJE_CONTACTO_RESENA);
    }

    const conTelefono2 = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 5,
      texto: "Mi cel es +5492231234567",
    });
    expect(conTelefono2.success).toBe(false);
  });

  it("filtro anti-spam: rechaza emails en el texto", () => {
    const conEmail = esquemaGuardarResena.safeParse({
      profesionalId: PROFESIONAL_VALIDO,
      puntaje: 5,
      texto: "Escribime a cliente@ejemplo.com",
    });
    expect(conEmail.success).toBe(false);
    if (!conEmail.success) {
      expect(conEmail.error.issues[0]?.message).toBe(MENSAJE_CONTACTO_RESENA);
    }
  });

  it("rechaza profesionalId que no sea UUID", () => {
    const invalido = esquemaGuardarResena.safeParse({
      profesionalId: "no-es-uuid",
      puntaje: 5,
    });
    expect(invalido.success).toBe(false);
  });

  it("contiene los chips rápidos y etiquetas de puntaje requeridas", () => {
    expect(CHIPS_RAPIDOS).toContain("Puntual");
    expect(CHIPS_RAPIDOS).toContain("Prolijo");
    expect(CHIPS_RAPIDOS).toContain("Respetó el presupuesto");
    expect(CHIPS_RAPIDOS).toContain("Explicó bien");

    expect(ETIQUETAS_PUNTAJE[1]).toBe("Muy mal");
    expect(ETIQUETAS_PUNTAJE[2]).toBe("Mal");
    expect(ETIQUETAS_PUNTAJE[3]).toBe("Regular");
    expect(ETIQUETAS_PUNTAJE[4]).toBe("Bien");
    expect(ETIQUETAS_PUNTAJE[5]).toBe("Excelente");
  });
});
