import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Bienvenida from "./page";

describe("bienvenida", () => {
  it("muestra el título, la ciudad y los dos caminos de registro", () => {
    render(<Bienvenida />);
    expect(screen.getByText("Mar del Plata")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Oficios de confianza, cerca tuyo." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Todos con identidad y antecedentes verificados.")).toBeInTheDocument();

    const contratar = screen.getByRole("link", { name: /Necesito un profesional/ });
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

  it("permite mirar sin cuenta y enlaza normas, términos y privacidad", () => {
    render(<Bienvenida />);
    expect(screen.getByRole("link", { name: "Primero quiero mirar" })).toHaveAttribute(
      "href",
      "/inicio",
    );
    expect(screen.getByRole("link", { name: "Normas" })).toHaveAttribute("href", "/normas");
    expect(screen.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});
