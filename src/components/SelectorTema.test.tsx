import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { SelectorTema } from "./SelectorTema";

beforeEach(() => {
  document.cookie = "tema=; path=/; max-age=0";
  document.documentElement.classList.remove("dark");
});

describe("SelectorTema", () => {
  it("muestra las tres opciones en un grupo con nombre y marca Sistema por defecto", () => {
    render(<SelectorTema />);
    expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Sistema" })).toBeChecked();
  });

  it("al elegir Oscuro guarda la cookie y pone la clase dark; con Claro la saca", async () => {
    const usuario = userEvent.setup();
    render(<SelectorTema />);

    await usuario.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
    expect(document.cookie).toContain("tema=oscuro");
    expect(document.documentElement).toHaveClass("dark");

    await usuario.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.cookie).toContain("tema=claro");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("se puede usar con teclado", async () => {
    const usuario = userEvent.setup();
    render(<SelectorTema />);
    await usuario.tab();
    expect(screen.getByRole("radio", { name: "Sistema" })).toHaveFocus();
    await usuario.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
    expect(document.documentElement).toHaveClass("dark");
  });
});
