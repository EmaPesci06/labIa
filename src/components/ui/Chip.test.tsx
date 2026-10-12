import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Chip, GrupoChips } from "./Chip";

describe("Chip", () => {
  it("expone aria-pressed según esté seleccionado", () => {
    const { rerender } = render(<Chip seleccionado={false}>Gas</Chip>);
    expect(screen.getByRole("button", { name: "Gas" })).toHaveAttribute("aria-pressed", "false");
    rerender(<Chip seleccionado>Gas</Chip>);
    expect(screen.getByRole("button", { name: "Gas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("el objetivo táctil es de 44 px", () => {
    render(<Chip seleccionado={false}>Gas</Chip>);
    expect(screen.getByRole("button", { name: "Gas" })).toHaveClass("min-h-11");
  });
});

const OPCIONES = [
  { valor: "gas", etiqueta: "Gas" },
  { valor: "pintura", etiqueta: "Pintura" },
  { valor: "plomeria", etiqueta: "Plomería" },
];

describe("GrupoChips", () => {
  it("múltiple: es un group con botones aria-pressed y alterna", async () => {
    const alCambiar = vi.fn();
    render(
      <GrupoChips
        tipo="multiple"
        etiqueta="Filtros"
        opciones={OPCIONES}
        valor={["gas"]}
        onChange={alCambiar}
      />,
    );
    expect(screen.getByRole("group", { name: "Filtros" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pintura" }));
    expect(alCambiar).toHaveBeenCalledWith(["gas", "pintura"]);
    await userEvent.click(screen.getByRole("button", { name: "Gas" }));
    expect(alCambiar).toHaveBeenLastCalledWith([]);
  });

  it("única: es un radiogroup y las flechas cambian la selección", async () => {
    const alCambiar = vi.fn();
    render(
      <GrupoChips
        tipo="unica"
        etiqueta="Oficio"
        opciones={OPCIONES}
        valor="gas"
        onChange={alCambiar}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Oficio" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gas" })).toBeChecked();
    screen.getByRole("radio", { name: "Gas" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(alCambiar).toHaveBeenCalledWith("pintura");
  });
});
