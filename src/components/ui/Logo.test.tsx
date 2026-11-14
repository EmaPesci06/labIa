import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("completo: es la palabra LabÍA con texto accesible", () => {
    render(<Logo />);
    const logo = screen.getByRole("img", { name: "LabÍA" });
    expect(logo).toHaveTextContent("LabÍA");
    expect(logo).toHaveClass("font-titulo", "text-accion");
  });

  it("sobre el encabezado usa blanco y no accion", () => {
    render(<Logo sobre="encabezado" />);
    const logo = screen.getByRole("img", { name: "LabÍA" });
    expect(logo).toHaveClass("text-sobre-encabezado");
    expect(logo).not.toHaveClass("text-accion");
  });

  it("icono: una L en un cuadrado de acción", () => {
    render(<Logo variante="icono" />);
    const icono = screen.getByRole("img", { name: "LabÍA" });
    expect(icono).toHaveTextContent("L");
    expect(icono).toHaveClass("bg-accion", "text-sobre-accion");
  });

  it("con alt vacío es decorativo y se oculta a lectores de pantalla", () => {
    const { container } = render(<Logo alt="" className="text-2xl" />);
    expect(screen.queryByRole("img", { name: "LabÍA" })).toBeNull();
    const decorativo = container.querySelector('[aria-hidden="true"]');
    expect(decorativo).toHaveTextContent("LabÍA");
    expect(decorativo).toHaveClass("text-2xl");
  });
});
