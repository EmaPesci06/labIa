import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/registro/normas", () => ({
  aceptarNormas: vi.fn(),
}));

import { FormularioNormas } from "./FormularioNormas";
import { ListaNormas, QueHaceLabia } from "./ListaNormas";
import { ListaNormasRegistro } from "./ListaNormasRegistro";

describe("ListaNormas y QueHaceLabia", () => {
  it("muestra la lista de compromisos de seguridad", () => {
    render(<ListaNormas />);
    expect(screen.getByRole("list", { name: "Compromisos de seguridad" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("muestra qué hace Oficio Seguro", () => {
    render(<QueHaceLabia />);
    expect(screen.getByRole("heading", { name: "Qué hace Oficio Seguro" })).toBeInTheDocument();
  });

  it("muestra la lista de normas para el registro profesional", () => {
    render(<ListaNormasRegistro />);
    expect(screen.getByRole("list", { name: "Compromisos de seguridad" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
});

describe("FormularioNormas", () => {
  it("muestra la casilla y el botón con aviso si no se tildó", async () => {
    render(<FormularioNormas textoBoton="Aceptar y seguir" />);
    const boton = screen.getByRole("button", { name: "Aceptar y seguir" });
    expect(boton).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(boton);
    expect(screen.getByText("Aceptá las normas para seguir")).toBeInTheDocument();

    const casilla = screen.getByRole("checkbox", {
      name: "Leí las diez y me comprometo a cumplirlas",
    });
    await userEvent.click(casilla);
    expect(boton).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText("Aceptá las normas para seguir")).not.toBeInTheDocument();
  });
});
