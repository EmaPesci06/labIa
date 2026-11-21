import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("completo: insignia y nombre, con texto accesible", () => {
    render(<Logo />);
    const logo = screen.getByRole("img", { name: "Oficio Seguro" });
    expect(logo.tagName.toLowerCase()).toBe("svg");
    expect(logo).toHaveClass("text-texto");
    expect(logo.querySelector(".fill-marca")).not.toBeNull();
    expect(logo.querySelectorAll('path[fill="currentColor"]')).toHaveLength(2);
  });

  it("sobre el encabezado el nombre va en blanco", () => {
    render(<Logo sobre="encabezado" />);
    const logo = screen.getByRole("img", { name: "Oficio Seguro" });
    expect(logo).toHaveClass("text-sobre-encabezado");
    expect(logo).not.toHaveClass("text-texto");
  });

  it("icono: solo la insignia con sus 12 ondas", () => {
    render(<Logo variante="icono" />);
    const icono = screen.getByRole("img", { name: "Oficio Seguro" });
    expect(icono.querySelectorAll(".fill-marca circle")).toHaveLength(13);
    expect(icono.querySelector('path[fill="currentColor"]')).toBeNull();
  });

  it("con alt vacío es decorativo y se oculta a lectores de pantalla", () => {
    const { container } = render(<Logo alt="" className="text-2xl" />);
    expect(screen.queryByRole("img", { name: "Oficio Seguro" })).toBeNull();
    const decorativo = container.querySelector('[aria-hidden="true"]');
    expect(decorativo).not.toBeNull();
    expect(decorativo).toHaveClass("text-2xl");
  });
});
