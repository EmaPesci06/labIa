import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Estrellas } from "./Estrellas";

describe("Estrellas", () => {
  it("solo lectura: se lee el puntaje", () => {
    render(<Estrellas valor={4.5} />);
    expect(screen.getByRole("img", { name: "4,5 de 5 estrellas" })).toBeInTheDocument();
  });

  it("selección: cinco opciones de radio y la elegida está marcada", () => {
    render(<Estrellas valor={3} onChange={() => {}} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
  });

  it("selección: clic elige", async () => {
    const alCambiar = vi.fn();
    render(<Estrellas valor={0} onChange={alCambiar} />);
    await userEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(alCambiar).toHaveBeenCalledWith(4);
  });

  it("selección: se maneja con el teclado", async () => {
    const alCambiar = vi.fn();
    render(<Estrellas valor={3} onChange={alCambiar} />);
    screen.getByRole("radio", { name: "3 estrellas" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(alCambiar).toHaveBeenLastCalledWith(4);
    await userEvent.keyboard("{ArrowLeft}");
    expect(alCambiar).toHaveBeenLastCalledWith(2);
    await userEvent.keyboard("{End}");
    expect(alCambiar).toHaveBeenLastCalledWith(5);
    await userEvent.keyboard("{Home}");
    expect(alCambiar).toHaveBeenLastCalledWith(1);
  });

  it("cada estrella es un objetivo de 44 px", () => {
    render(<Estrellas valor={0} onChange={() => {}} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveClass("size-11");
  });

  it("admite etiquetas personalizadas para accesibilidad", () => {
    render(
      <Estrellas
        valor={5}
        onChange={() => {}}
        etiquetasPuntaje={{
          1: "Muy mal",
          2: "Mal",
          3: "Regular",
          4: "Bien",
          5: "Excelente",
        }}
      />,
    );
    expect(screen.getByRole("radio", { name: "Excelente" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Muy mal" })).toBeInTheDocument();
  });
});
