import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CampoContrasena } from "./CampoContrasena";
import { SelectorBarrio } from "./SelectorBarrio";

const BARRIOS = [
  { id: 20, nombre: "Chauvín" },
  { id: 30, nombre: "Playa Grande" },
  { id: 31, nombre: "Plaza Mitre" },
];

describe("SelectorBarrio", () => {
  it("elegir un barrio guarda el id en el select", async () => {
    render(<SelectorBarrio barrios={BARRIOS} />);
    const selector = screen.getByRole("combobox", { name: "Tu barrio" });
    await userEvent.selectOptions(selector, "17");
    expect(selector).toHaveValue("17");
  });

  it("ofrece los 7 barrios más comunes más los de la lista sin repetir", () => {
    render(<SelectorBarrio barrios={BARRIOS} />);
    // 1 opción vacía ("Elegí tu barrio") + 7 comunes + 2 adicionales (Chauvín ya está en los comunes).
    expect(screen.getAllByRole("option")).toHaveLength(10);
    expect(screen.getByRole("option", { name: "Playa Grande" })).toBeInTheDocument();
  });

  it("sin lista de barrios ofrece igual los 7 más comunes", () => {
    render(<SelectorBarrio barrios={[]} />);
    expect(screen.getAllByRole("option")).toHaveLength(8);
    expect(screen.getByRole("option", { name: "La Perla" })).toBeInTheDocument();
  });

  it("respeta el valorInicial elegido", () => {
    render(<SelectorBarrio barrios={BARRIOS} valorInicial="30" />);
    expect(screen.getByRole("combobox", { name: "Tu barrio" })).toHaveValue("30");
  });

  it("avisa con alCambiar cuando se elige otro barrio", async () => {
    const alCambiar = vi.fn();
    render(<SelectorBarrio barrios={BARRIOS} valorInicial="30" alCambiar={alCambiar} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tu barrio" }), "17");
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it("muestra el error y el aviso de privacidad asociados al selector", () => {
    render(<SelectorBarrio barrios={[]} error="Elegí tu barrio." />);
    expect(screen.getByRole("combobox", { name: "Tu barrio" })).toHaveAccessibleDescription(
      "Elegí tu barrio. Nunca te pedimos la dirección.",
    );
  });
});

describe("CampoContrasena", () => {
  it("muestra y oculta la contraseña", async () => {
    render(<CampoContrasena etiqueta="Contraseña" name="contrasena" />);
    const campo = screen.getByLabelText("Contraseña");
    expect(campo).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Ver contraseña" }));
    expect(campo).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo).toHaveAttribute("type", "password");
  });
});
