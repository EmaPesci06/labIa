import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CampoContrasena } from "./CampoContrasena";
import { SelectorBarrio } from "./SelectorBarrio";

const BARRIOS = [
  { id: 20, nombre: "Chauvín" },
  { id: 30, nombre: "Playa Grande" },
  { id: 31, nombre: "Plaza Mitre" },
];

describe("SelectorBarrio", () => {
  it("elegir un chip guarda el id en el campo oculto", async () => {
    const { container } = render(<SelectorBarrio barrios={BARRIOS} />);
    await userEvent.click(screen.getByRole("radio", { name: "Centro" }));
    expect(container.querySelector<HTMLInputElement>('input[name="barrio"]')?.value).toBe("17");
  });

  it("ofrece los 7 barrios más comunes y 'Otro barrio'", () => {
    render(<SelectorBarrio barrios={BARRIOS} />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: "Otro barrio" })).toBeInTheDocument();
  });

  it("sin lista de barrios no ofrece 'Otro barrio'", () => {
    render(<SelectorBarrio barrios={[]} />);
    expect(screen.queryByRole("radio", { name: "Otro barrio" })).not.toBeInTheDocument();
  });

  it("'Otro barrio' abre un buscador que filtra sin acentos", async () => {
    const { container } = render(<SelectorBarrio barrios={BARRIOS} />);
    await userEvent.click(screen.getByRole("radio", { name: "Otro barrio" }));
    const buscador = screen.getByRole("combobox", { name: "Buscá tu barrio" });
    await userEvent.type(buscador, "chauvin");
    const opciones = screen.getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Chauvín"]);
    await userEvent.keyboard("{Enter}");
    expect(container.querySelector<HTMLInputElement>('input[name="barrio"]')?.value).toBe("20");
    expect(buscador).toHaveValue("Chauvín");
  });

  it("escribir de nuevo en el buscador borra la elección anterior", async () => {
    const { container } = render(<SelectorBarrio barrios={BARRIOS} valorInicial="30" />);
    const buscador = screen.getByRole("combobox", { name: "Buscá tu barrio" });
    expect(buscador).toHaveValue("Playa Grande");
    await userEvent.type(buscador, "x");
    expect(container.querySelector<HTMLInputElement>('input[name="barrio"]')?.value).toBe("");
  });

  it("muestra el error y el aviso de privacidad asociados al grupo", () => {
    render(<SelectorBarrio barrios={[]} error="Elegí tu barrio." />);
    expect(screen.getByRole("group", { name: "Tu barrio" })).toHaveAccessibleDescription(
      "Elegí tu barrio. Tu dirección exacta nunca se muestra. Solo tu barrio.",
    );
  });
});

describe("CampoContrasena", () => {
  it("muestra y oculta la contraseña", async () => {
    render(<CampoContrasena etiqueta="Contraseña" name="contrasena" />);
    const campo = screen.getByLabelText("Contraseña");
    expect(campo).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(campo).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo).toHaveAttribute("type", "password");
  });
});
