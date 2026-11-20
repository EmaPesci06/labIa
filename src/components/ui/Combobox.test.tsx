import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Combobox } from "./Combobox";

const BARRIOS = [
  { valor: "1", etiqueta: "Centro" },
  { valor: "2", etiqueta: "La Perla" },
  { valor: "3", etiqueta: "Chauvín" },
  { valor: "4", etiqueta: "Güemes" },
];

describe("Combobox", () => {
  it("filtra sin distinguir acentos, elige con teclado y anuncia la opción", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <form>
        <Combobox
          etiqueta="Tu barrio"
          name="barrio"
          opciones={BARRIOS}
          placeholder="Elegí tu barrio"
          placeholderBusqueda="Buscá tu barrio…"
          sinResultados="No encontramos ese barrio."
          onValueChange={onValueChange}
        />
      </form>,
    );

    const trigger = screen.getByRole("combobox", { name: "Tu barrio" });
    await user.click(trigger);

    const buscador = screen.getByPlaceholderText("Buscá tu barrio…");
    await user.type(buscador, "chauvin");
    expect(screen.getByRole("option", { name: "Chauvín" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("3");
    expect(trigger).toHaveTextContent("Chauvín");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Tu barrio: Chauvín");

    const form = trigger.closest("form");
    expect(new FormData(form!).get("barrio")).toBe("3");
  });

  it("navega opciones con ArrowDown dentro de la lista abierta y confirma con Enter", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox etiqueta="Tu barrio" opciones={BARRIOS} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Tu barrio" });
    await user.click(trigger);

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("2");
    expect(trigger).toHaveTextContent("La Perla");
    expect(screen.getByRole("status")).toHaveTextContent("Tu barrio: La Perla");
  });

  it("cierra con Esc y devuelve el foco al botón", async () => {
    const user = userEvent.setup();
    render(<Combobox etiqueta="Tu barrio" opciones={BARRIOS} />);
    const trigger = screen.getByRole("combobox", { name: "Tu barrio" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("muestra el mensaje de sin resultados cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        etiqueta="Tu barrio"
        opciones={BARRIOS}
        placeholderBusqueda="Buscá tu barrio…"
        sinResultados="No encontramos ese barrio."
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Tu barrio" }));
    await user.type(screen.getByPlaceholderText("Buscá tu barrio…"), "zzzzz");
    expect(screen.getByText("No encontramos ese barrio.")).toBeInTheDocument();
  });

  it("aspecto pastilla muestra prefijo y respeta valor controlado", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        aspecto="pastilla"
        etiqueta="Tu barrio"
        prefijo="Estás en"
        borde
        value="2"
        opciones={BARRIOS}
        onValueChange={onValueChange}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Estás en: Tu barrio" });
    expect(trigger).toHaveTextContent("Estás en");
    expect(trigger).toHaveTextContent("La Perla");

    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Centro" }));
    expect(onValueChange).toHaveBeenCalledWith("1");
  });
});
