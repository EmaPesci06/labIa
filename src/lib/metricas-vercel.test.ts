import { describe, expect, it } from "vitest";

import { limpiarEventoVercel } from "./metricas-vercel";

describe("limpiarEventoVercel", () => {
  it("saca el query string de la URL", () => {
    const evento = limpiarEventoVercel({
      type: "pageview",
      url: "https://labia.app/buscar?tel=%2B5492235551234&oficio=gas",
    });
    expect(evento.url).toBe("https://labia.app/buscar");
  });

  it("saca el hash de la URL", () => {
    const evento = limpiarEventoVercel({ type: "pageview", url: "https://labia.app/#t=abc123" });
    expect(evento.url).toBe("https://labia.app/");
  });

  it("saca query y hash juntos, y conserva el resto del evento", () => {
    const evento = limpiarEventoVercel({
      type: "vital",
      route: "/profesionales/[id]",
      url: "https://labia.app/profesionales/7?tel=2235551234#t=xyz",
    });
    expect(evento).toEqual({
      type: "vital",
      route: "/profesionales/[id]",
      url: "https://labia.app/profesionales/7",
    });
  });

  it("deja igual una URL sin parámetros y no muta el original", () => {
    const original = { type: "pageview", url: "https://labia.app/normas?x=1" };
    limpiarEventoVercel(original);
    expect(original.url).toBe("https://labia.app/normas?x=1");
    expect(limpiarEventoVercel({ url: "https://labia.app/normas" }).url).toBe(
      "https://labia.app/normas",
    );
  });
});
