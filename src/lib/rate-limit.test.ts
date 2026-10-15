import { beforeEach, describe, expect, it } from "vitest";

import { consultarIntentos, limitarIntentos, reiniciarLimites } from "./rate-limit";

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

describe("limitarIntentos: memoria acotada", () => {
  it("al llenarse desaloja las entradas más viejas sin olvidar las recientes", () => {
    const ventana = { maximo: 1, ventanaMs: 60_000_000 };
    limitarIntentos("vieja", ventana, 1000);
    limitarIntentos("vieja", ventana, 1000); // bloqueada
    for (let i = 0; i < 5000; i++) limitarIntentos(`ip-${i}`, ventana, 1000);
    // "vieja" fue la más antigua: salió del mapa y vuelve a entrar.
    expect(limitarIntentos("vieja", ventana, 1000).permitido).toBe(true);
    limitarIntentos("reciente", ventana, 1000);
    expect(limitarIntentos("reciente", ventana, 1000).permitido).toBe(false);
  });
});

describe("consultarIntentos (lectura sin consumo)", () => {
  const cupo = { maximo: 2, ventanaMs: 60_000 };

  it("no cuenta: consultar no mueve el conteo", () => {
    for (let i = 0; i < 10; i++) expect(consultarIntentos("c", cupo, 1000).permitido).toBe(true);
    // Después de 10 consultas sigue habiendo cupo completo para dos consumos.
    expect(limitarIntentos("c", cupo, 1000).permitido).toBe(true);
    expect(limitarIntentos("c", cupo, 1000).permitido).toBe(true);
  });

  it("con el cupo agotado bloquea, avisa los segundos y no cambia nada al repetir", () => {
    limitarIntentos("c", cupo, 1000);
    limitarIntentos("c", cupo, 1000);
    const primera = consultarIntentos("c", cupo, 1000);
    const segunda = consultarIntentos("c", cupo, 1000);
    expect(primera.permitido).toBe(false);
    expect(primera.segundosParaReintentar).toBeGreaterThan(0);
    expect(segunda).toEqual(primera);
  });

  it("vencida la ventana vuelve a dar cupo", () => {
    limitarIntentos("c", cupo, 1000);
    limitarIntentos("c", cupo, 1000);
    expect(consultarIntentos("c", cupo, 1000 + 60_001).permitido).toBe(true);
  });
});
