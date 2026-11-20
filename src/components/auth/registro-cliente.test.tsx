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
  it("elegir un barrio guarda el id en el campo oculto del formulario", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <SelectorBarrio barrios={BARRIOS} />
      </form>,
    );
    const selector = screen.getByRole("combobox", { name: "Tu barrio" });
    await user.click(selector);
    await user.click(screen.getByRole("option", { name: "Centro" }));
    expect(selector).toHaveTextContent("Centro");
    expect(new FormData(selector.closest("form")!).get("barrio")).toBe("17");
  });

  it("ofrece los 7 barrios más comunes más los de la lista sin repetir", async () => {
    const user = userEvent.setup();
    render(<SelectorBarrio barrios={BARRIOS} />);
    await user.click(screen.getByRole("combobox", { name: "Tu barrio" }));
    // 7 comunes + 2 adicionales (Chauvín ya está en los comunes).
    expect(screen.getAllByRole("option")).toHaveLength(9);
    expect(screen.getByRole("option", { name: "Playa Grande" })).toBeInTheDocument();
  });

  it("sin lista de barrios ofrece igual los 7 más comunes", async () => {
    const user = userEvent.setup();
    render(<SelectorBarrio barrios={[]} />);
    await user.click(screen.getByRole("combobox", { name: "Tu barrio" }));
    expect(screen.getAllByRole("option")).toHaveLength(7);
    expect(screen.getByRole("option", { name: "La Perla" })).toBeInTheDocument();
  });

  it("respeta el valorInicial elegido", () => {
    render(
      <form>
        <SelectorBarrio barrios={BARRIOS} valorInicial="30" />
      </form>,
    );
    const selector = screen.getByRole("combobox", { name: "Tu barrio" });
    expect(selector).toHaveTextContent("Playa Grande");
    expect(new FormData(selector.closest("form")!).get("barrio")).toBe("30");
  });

  it("avisa con alCambiar cuando se elige otro barrio", async () => {
    const user = userEvent.setup();
    const alCambiar = vi.fn();
    render(<SelectorBarrio barrios={BARRIOS} valorInicial="30" alCambiar={alCambiar} />);
    await user.click(screen.getByRole("combobox", { name: "Tu barrio" }));
    await user.click(screen.getByRole("option", { name: "Centro" }));
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
