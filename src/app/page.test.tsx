import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Bienvenida from "./page";

describe("bienvenida", () => {
  it("muestra el título, la pregunta y los dos caminos de registro", () => {
    render(<Bienvenida />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Oficios de confianza, cerca tuyo." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Qué querés hacer?" })).toBeInTheDocument();

    const contratar = screen.getByRole("link", { name: /Quiero contratar/ });
    expect(contratar).toHaveAttribute("href", "/registro/cliente");
    const ofrecer = screen.getByRole("link", { name: /Ofrezco mis servicios/ });
    expect(ofrecer).toHaveAttribute("href", "/registro/profesional");
  });

  it("lleva a ingresar si ya tiene cuenta", () => {
    render(<Bienvenida />);
    const enlaces = screen.getAllByRole("link", { name: "Ingresar" });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const enlace of enlaces) expect(enlace).toHaveAttribute("href", "/ingresar");
  });

  it("lista los siete oficios", () => {
    render(<Bienvenida />);
    expect(
      screen.getByText(
        "Carpintería · Plomería · Cerrajería · Gas · Pintura · Mecánica · Electricidad",
      ),
    ).toBeInTheDocument();
  });
});
