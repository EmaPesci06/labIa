import { beforeEach, describe, expect, it } from "vitest";

import { limitarIntentos, reiniciarLimites } from "./rate-limit";

const regla = { maximo: 5, ventanaMs: 60_000 };

beforeEach(reiniciarLimites);

describe("limitarIntentos", () => {
  it("permite 5 intentos por minuto y bloquea el sexto", () => {
    for (let i = 0; i < 5; i++) expect(limitarIntentos("ip", regla, 1000).permitido).toBe(true);
    const sexto = limitarIntentos("ip", regla, 2000);
    expect(sexto.permitido).toBe(false);
    expect(sexto.segundosParaReintentar).toBeGreaterThan(0);
  });

  it("cada clave tiene su propia cuenta", () => {
    for (let i = 0; i < 6; i++) limitarIntentos("a", regla, 1000);
    expect(limitarIntentos("b", regla, 1000).permitido).toBe(true);
  });

  it("después de la ventana vuelve a permitir", () => {
    for (let i = 0; i < 6; i++) limitarIntentos("ip", regla, 1000);
    expect(limitarIntentos("ip", regla, 1000 + 60_001).permitido).toBe(true);
  });
});
