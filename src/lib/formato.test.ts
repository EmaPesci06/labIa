import { describe, expect, it } from "vitest";

import { formatearDistancia, formatearPesos, haceCuanto } from "./formato";

// Intl usa espacios de no separación; los normalizamos para comparar.
const sinNbsp = (texto: string) => texto.replace(/ /g, " ");

describe("formatearPesos", () => {
  it("usa punto de miles y sin decimales", () => {
    expect(sinNbsp(formatearPesos(12500))).toBe("$ 12.500");
    expect(sinNbsp(formatearPesos(1500000))).toBe("$ 1.500.000");
  });

  it("redondea los centavos", () => {
    expect(sinNbsp(formatearPesos(999.6))).toBe("$ 1.000");
  });

  it("formatea el cero", () => {
    expect(sinNbsp(formatearPesos(0))).toBe("$ 0");
  });

  it("rechaza valores no numéricos", () => {
    expect(() => formatearPesos(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatearDistancia", () => {
  it("muestra una decimal con coma", () => {
    expect(formatearDistancia(1.234)).toBe("a 1,2 km");
  });

  it("usa coma también por debajo de 1 km", () => {
    expect(formatearDistancia(0.8)).toBe("a 0,8 km");
  });

  it("agrega el ,0 a los enteros", () => {
    expect(formatearDistancia(3)).toBe("a 3,0 km");
    expect(formatearDistancia(0)).toBe("a 0,0 km");
  });

  it("redondea a una decimal", () => {
    expect(formatearDistancia(2.96)).toBe("a 3,0 km");
    expect(formatearDistancia(12.34)).toBe("a 12,3 km");
  });

  it("rechaza distancias negativas o inválidas", () => {
    expect(() => formatearDistancia(-1)).toThrow(RangeError);
    expect(() => formatearDistancia(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("haceCuanto", () => {
  const ahora = new Date("2026-10-11T15:00:00-03:00");
  const antes = (ms: number) => new Date(ahora.getTime() - ms);
  const MIN = 60_000;

  it("dice 'recién' para menos de un minuto o fechas futuras", () => {
    expect(haceCuanto(antes(30_000), ahora)).toBe("recién");
    expect(haceCuanto(antes(-5 * MIN), ahora)).toBe("recién");
  });

  it("cuenta minutos", () => {
    expect(haceCuanto(antes(20 * MIN), ahora)).toBe("hace 20 min");
  });

  it("cuenta horas", () => {
    expect(haceCuanto(antes(3 * 60 * MIN), ahora)).toBe("hace 3 h");
  });

  it("cuenta días en singular y plural", () => {
    expect(haceCuanto(antes(24 * 60 * MIN), ahora)).toBe("hace 1 día");
    expect(haceCuanto(antes(2 * 24 * 60 * MIN), ahora)).toBe("hace 2 días");
  });

  it("pasa a meses y años", () => {
    expect(haceCuanto(antes(45 * 24 * 60 * MIN), ahora)).toBe("hace 1 mes");
    expect(haceCuanto(antes(800 * 24 * 60 * MIN), ahora)).toBe("hace 2 años");
  });

  it("acepta texto ISO", () => {
    expect(haceCuanto("2026-10-11T14:40:00-03:00", ahora)).toBe("hace 20 min");
  });

  it("rechaza fechas inválidas", () => {
    expect(() => haceCuanto("no es una fecha", ahora)).toThrow(RangeError);
  });
});
