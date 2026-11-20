import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/shadcn/button";
import { contraste, CSS_GLOBALS, hexDe } from "@/lib/tokens-css";

/*
 * LAB-82: el botón de shadcn (sin editar) sale con la paleta "Verano en la costa". jsdom no
 * calcula CSS, así que se verifica la cadena completa: clase del botón → variable de shadcn →
 * token de LabÍA → hex de cada tema.
 */

function variable(nombre: string): string {
  const coincidencia = new RegExp(String.raw`--${nombre}:\s*var\(--color-([a-z-]+)\);`).exec(
    CSS_GLOBALS,
  );
  if (!coincidencia?.[1]) throw new Error(`--${nombre} no está atada a un token`);
  return coincidencia[1];
}

describe("Button de shadcn con la paleta de LabÍA", () => {
  it("se renderiza como botón accesible con la variante principal", () => {
    render(<Button>Buscar</Button>);
    const boton = screen.getByRole("button", { name: "Buscar" });
    expect(boton).toHaveAttribute("data-slot", "button");
    expect(boton.className).toContain("bg-primary");
    expect(boton.className).toContain("text-primary-foreground");
  });

  it("--primary es accion y --primary-foreground es sobre-accion", () => {
    expect(variable("primary")).toBe("accion");
    expect(variable("primary-foreground")).toBe("sobre-accion");
  });

  it.each(["claro", "oscuro"] as const)("%s: el texto del botón pasa AA sobre accion", (tema) => {
    const fondo = hexDe(tema, variable("primary"));
    const texto = hexDe(tema, variable("primary-foreground"));
    expect(fondo).toBe(hexDe(tema, "accion"));
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it("el foco de 3 px sale del token foco: texto en claro, sol en oscuro", () => {
    expect(variable("ring")).toBe("foco");
    expect(CSS_GLOBALS).toMatch(
      /\[data-slot\]:focus-visible\s*\{\s*outline:\s*3px solid var\(--color-foco\);\s*outline-offset:\s*2px;/,
    );
    expect(hexDe("claro", "foco")).toBe(hexDe("claro", "texto"));
    expect(hexDe("oscuro", "foco")).toBe(hexDe("oscuro", "sol"));
  });

  it("las variables de shadcn apuntan a los tokens pedidos en LAB-82", () => {
    const esperado: Record<string, string> = {
      background: "fondo",
      foreground: "texto",
      card: "superficie",
      "card-foreground": "texto",
      popover: "superficie",
      "popover-foreground": "texto",
      primary: "accion",
      "primary-foreground": "sobre-accion",
      secondary: "sol",
      "secondary-foreground": "sobre-sol",
      accent: "sol",
      "accent-foreground": "sobre-sol",
      destructive: "error",
      ring: "foco",
      input: "campo",
      muted: "fondo",
      "muted-foreground": "texto-suave",
      border: "borde",
    };
    for (const [nombre, token] of Object.entries(esperado)) {
      expect(variable(nombre), nombre).toBe(token);
    }
    expect(CSS_GLOBALS).not.toMatch(/--destructive-foreground\s*:/);
  });

  it("mantiene nuestra variante dark (clase .dark) y no la de shadcn", () => {
    expect(CSS_GLOBALS).toContain("@custom-variant dark (&:where(.dark, .dark *)");
    expect(CSS_GLOBALS).not.toContain("@custom-variant dark (&:is(.dark *))");
  });
});
