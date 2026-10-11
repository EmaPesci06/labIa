import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("completo: una imagen para cada tema, la oscura oculta en claro", () => {
    const { container } = render(<Logo />);
    const imagenes = container.querySelectorAll("img");
    expect(imagenes).toHaveLength(2);

    const clara = container.querySelector('img[data-tema="claro"]');
    const oscura = container.querySelector('img[data-tema="oscuro"]');
    expect(clara).toHaveAttribute("src", expect.stringContaining("labia-logo.png"));
    expect(clara).toHaveClass("dark:hidden");
    expect(clara).not.toHaveClass("hidden");
    expect(oscura).toHaveAttribute("src", expect.stringContaining("labia-logo-oscuro.png"));
    expect(oscura).toHaveClass("hidden", "dark:block");
  });

  it("tiene texto alternativo LabÍA por defecto", () => {
    render(<Logo variante="icono" />);
    expect(screen.getByRole("img", { name: "LabÍA" })).toHaveAttribute(
      "src",
      expect.stringContaining("labia-icono.png"),
    );
  });

  it("acepta alt vacío cuando es decorativo y clases propias", () => {
    const { container } = render(<Logo alt="" className="h-8" />);
    expect(screen.queryByRole("img", { name: "LabÍA" })).toBeNull();
    for (const img of container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveClass("h-8");
      expect(img).not.toHaveClass("h-10");
    }
  });
});
