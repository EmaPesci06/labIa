import { describe, expect, it } from "vitest";

import { esImagenAceptada, recorteCuadrado, tamanoAjustado } from "./imagen";

describe("tamanoAjustado", () => {
  it("achica manteniendo la proporción hasta 1600 px", () => {
    expect(tamanoAjustado(4000, 3000, 1600)).toEqual({ ancho: 1600, alto: 1200 });
    expect(tamanoAjustado(3000, 4000, 1600)).toEqual({ ancho: 1200, alto: 1600 });
  });

  it("no agranda una imagen que ya es chica", () => {
    expect(tamanoAjustado(800, 600, 1600)).toEqual({ ancho: 800, alto: 600 });
  });
});

describe("recorteCuadrado", () => {
  it("toma el cuadrado central", () => {
    expect(recorteCuadrado(1000, 600)).toEqual({ x: 200, y: 0, lado: 600 });
    expect(recorteCuadrado(600, 1000)).toEqual({ x: 0, y: 200, lado: 600 });
  });
});

describe("esImagenAceptada", () => {
  it("acepta JPG, PNG y WebP, y rechaza el resto", () => {
    expect(esImagenAceptada({ type: "image/jpeg" })).toBe(true);
    expect(esImagenAceptada({ type: "image/webp" })).toBe(true);
    expect(esImagenAceptada({ type: "application/pdf" })).toBe(false);
    expect(esImagenAceptada({ type: "image/svg+xml" })).toBe(false);
  });
});
