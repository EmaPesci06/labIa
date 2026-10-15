import { describe, expect, it } from "vitest";

import {
  MENSAJE_CONTACTO_POSTULACION,
  MENSAJE_SENA_MAYOR,
  erroresDePostulacion,
  esquemaPostulacion,
} from "./postulacion";

describe("esquemaPostulacion", () => {
  it("acepta una postulación válida completa", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Puedo ir hoy a las 17 h. Reviso la pérdida y te paso presupuesto.",
      precioEstimado: "$ 40.000",
      senaPropuesta: "$ 10.000",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.precioEstimado).toBe(40000);
      expect(res.data.senaPropuesta).toBe(10000);
    }
  });

  it("acepta postulación sin precio ni seña", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Hola, me interesa tu trabajo. Cuándo podríamos coordinar?",
      precioEstimado: "",
      senaPropuesta: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.precioEstimado).toBeUndefined();
      expect(res.data.senaPropuesta).toBeUndefined();
    }
  });

  it("rechaza mensaje de menos de 20 caracteres", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Muy corto",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = erroresDePostulacion(res.error);
      expect(err.mensaje).toBe("Escribí al menos 20 caracteres.");
    }
  });

  it("rechaza mensaje con número de teléfono o contacto", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Llamame a mi whatsapp 2235558888 y coordinamos la visita.",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = erroresDePostulacion(res.error);
      expect(err.mensaje).toBe(MENSAJE_CONTACTO_POSTULACION);
    }
  });

  it("rechaza mensaje con email", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Escribime a plomero@gmail.com para coordinar un presupuesto.",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = erroresDePostulacion(res.error);
      expect(err.mensaje).toBe(MENSAJE_CONTACTO_POSTULACION);
    }
  });

  it("rechaza si la seña es mayor al precio estimado", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Puedo pasar hoy por la tarde a revisar la instalación.",
      precioEstimado: "20000",
      senaPropuesta: "25000",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = erroresDePostulacion(res.error);
      expect(err.senaPropuesta).toBe(MENSAJE_SENA_MAYOR);
    }
  });

  it("acepta si la seña es igual al precio estimado", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Puedo pasar hoy por la tarde a revisar la instalación.",
      precioEstimado: "20000",
      senaPropuesta: "20000",
    });
    expect(res.success).toBe(true);
  });
});

describe("esquemaPostulacion · dirección exacta (LAB-53)", () => {
  it("rechaza una dirección exacta en el mensaje", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Paso por Independencia 2100 mañana a las 9 y reviso el caño.",
    });
    expect(res.success).toBe(false);
    if (!res.success)
      expect(erroresDePostulacion(res.error).mensaje).toBe(MENSAJE_CONTACTO_POSTULACION);
  });

  it("acepta un mensaje con precio y medidas", () => {
    const res = esquemaPostulacion.safeParse({
      mensaje: "Son 2x3 m de pintura, el material sale $ 45.000 y tardo medio día.",
    });
    expect(res.success).toBe(true);
  });
});
