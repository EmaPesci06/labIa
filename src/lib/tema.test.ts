import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aplicarTema,
  esOscuro,
  guardarPreferencia,
  leerPreferencia,
  PREFERENCIAS_TEMA,
  SCRIPT_TEMA,
} from "./tema";

function simularSistema(oscuro: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((consulta: string) => ({
      matches: oscuro && consulta.includes("dark"),
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function borrarCookie() {
  document.cookie = "tema=; path=/; max-age=0";
}

beforeEach(() => {
  borrarCookie();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("leerPreferencia", () => {
  it("devuelve sistema si no hay cookie o el valor no es válido", () => {
    expect(leerPreferencia("")).toBe("sistema");
    expect(leerPreferencia("tema=violeta")).toBe("sistema");
    expect(leerPreferencia("otratema=oscuro")).toBe("sistema");
  });

  it("lee la cookie tema entre otras", () => {
    expect(leerPreferencia("a=1; tema=oscuro; b=2")).toBe("oscuro");
    expect(leerPreferencia("tema=claro")).toBe("claro");
  });
});

describe("esOscuro", () => {
  it("respeta la elección y, en sistema, la preferencia del sistema", () => {
    expect(esOscuro("oscuro", false)).toBe(true);
    expect(esOscuro("claro", true)).toBe(false);
    expect(esOscuro("sistema", true)).toBe(true);
    expect(esOscuro("sistema", false)).toBe(false);
  });
});

describe("guardarPreferencia", () => {
  it("guarda la cookie tema y aplica la clase dark", () => {
    simularSistema(false);
    guardarPreferencia("oscuro");
    expect(document.cookie).toContain("tema=oscuro");
    expect(document.documentElement).toHaveClass("dark");

    guardarPreferencia("claro");
    expect(document.cookie).toContain("tema=claro");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});

describe("SCRIPT_TEMA (script inline del <head>)", () => {
  const casos = PREFERENCIAS_TEMA.flatMap((preferencia) =>
    [true, false].map((sistemaOscuro) => ({ preferencia, sistemaOscuro })),
  );

  it.each(casos)(
    "con $preferencia y sistema oscuro=$sistemaOscuro da lo mismo que aplicarTema()",
    ({ preferencia, sistemaOscuro }) => {
      simularSistema(sistemaOscuro);
      document.cookie = `tema=${preferencia}; path=/`;

      new Function(SCRIPT_TEMA)();
      const conScript = document.documentElement.classList.contains("dark");

      document.documentElement.classList.remove("dark");
      aplicarTema();
      expect(conScript).toBe(document.documentElement.classList.contains("dark"));
      expect(conScript).toBe(esOscuro(preferencia, sistemaOscuro));
    },
  );

  it("sin cookie sigue al sistema", () => {
    simularSistema(true);
    new Function(SCRIPT_TEMA)();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("no rompe si matchMedia no existe", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(() => new Function(SCRIPT_TEMA)()).not.toThrow();
  });
});
