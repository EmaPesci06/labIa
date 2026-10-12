import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CintaBienvenida, CintaDistancia, CintaPasos, largoCinta } from "./cinta-metrica";

function anchoCinta(container: HTMLElement): string {
  const cinta = container.querySelector<HTMLElement>("[data-cinta]");
  if (!cinta) throw new Error("No hay cinta");
  return cinta.style.width;
}

describe("largoCinta", () => {
  it("30 px por km con mínimo 12 y máximo 120", () => {
    expect(largoCinta(1.2)).toBeCloseTo(36);
    expect(largoCinta(0.1)).toBe(12);
    expect(largoCinta(0)).toBe(12);
    expect(largoCinta(10)).toBe(120);
    expect(largoCinta(4)).toBe(120);
  });
});

describe("CintaDistancia", () => {
  it("la cinta mide km × 30 px y el texto se lee", () => {
    const { container } = render(<CintaDistancia km={1.2} />);
    expect(anchoCinta(container)).toBe("36px");
    expect(screen.getByText("a 1,2 km")).toBeInTheDocument();
  });

  it("respeta el mínimo y el máximo", () => {
    const corta = render(<CintaDistancia km={0.1} />);
    expect(anchoCinta(corta.container)).toBe("12px");
    const larga = render(<CintaDistancia km={9} />);
    expect(anchoCinta(larga.container)).toBe("120px");
  });

  it("la cinta es aria-hidden", () => {
    const { container } = render(<CintaDistancia km={2} />);
    expect(container.querySelector("[data-cinta]")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("CintaPasos", () => {
  const pasos = ["Datos", "Oficios", "Documentos", "Normas"];

  it("describe el paso actual", () => {
    render(<CintaPasos pasos={pasos} actual={2} />);
    expect(screen.getByRole("group", { name: "Paso 2 de 4: Oficios" })).toBeInTheDocument();
    expect(screen.getByText("Oficios")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Datos")).not.toHaveAttribute("aria-current");
  });

  it("la cinta ocupa el ancho hasta el paso actual", () => {
    const { container } = render(<CintaPasos pasos={pasos} actual={2} />);
    expect(anchoCinta(container)).toBe("50%");
  });
});

describe("CintaBienvenida", () => {
  it("anima con `cinta` y se detiene con reduced-motion", () => {
    const { container } = render(<CintaBienvenida />);
    const cinta = container.querySelector("[data-cinta]");
    expect(cinta).toHaveClass("animate-cinta", "motion-reduce:animate-none", "cinta-regla-grande");
    expect(cinta).toHaveAttribute("aria-hidden", "true");
  });
});
