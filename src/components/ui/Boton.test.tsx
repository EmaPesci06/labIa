import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Boton } from "./Boton";

describe("Boton", () => {
  it("dibuja un botón con las clases de la variante y el tamaño", () => {
    render(
      <Boton variante="profesional" tamano="grande">
        Postularme
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Postularme" });
    expect(boton).toHaveClass("bg-naranja-accion", "min-h-[52px]", "rounded-boton");
    expect(boton).toHaveAttribute("type", "button");
  });

  it("cargando: muestra el spinner, aria-busy y no dispara el clic", async () => {
    const alClic = vi.fn();
    render(
      <Boton cargando onClick={alClic}>
        Guardar
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(boton.querySelector("svg")).not.toBeNull();
    await userEvent.click(boton);
    expect(alClic).not.toHaveBeenCalled();
  });

  it("deshabilitado: queda disabled y no dispara el clic", async () => {
    const alClic = vi.fn();
    render(
      <Boton disabled onClick={alClic}>
        Enviar
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Enviar" });
    expect(boton).toBeDisabled();
    await userEvent.click(boton);
    expect(alClic).not.toHaveBeenCalled();
  });

  it("dispara el clic cuando está activo", async () => {
    const alClic = vi.fn();
    render(<Boton onClick={alClic}>Buscar</Boton>);
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(alClic).toHaveBeenCalledTimes(1);
  });

  it("variante peligro usa el token de error y reenvía el ref al botón", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <Boton variante="peligro" ref={ref}>
        Cancelar trabajo
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Cancelar trabajo" });
    expect(boton).toHaveClass("bg-error", "text-sobre-azul");
    expect(ref.current).toBe(boton);
  });

  it("con href se dibuja como enlace", () => {
    render(
      <Boton href="/registro" variante="secundario">
        Crear cuenta
      </Boton>,
    );
    const enlace = screen.getByRole("link", { name: "Crear cuenta" });
    expect(enlace).toHaveAttribute("href", "/registro");
    expect(enlace).toHaveClass("border-borde");
  });

  it("como enlace cargando no recibe clics ni foco", () => {
    render(
      <Boton href="/registro" cargando>
        Crear cuenta
      </Boton>,
    );
    const enlace = screen.getByRole("link", { name: "Crear cuenta" });
    expect(enlace).toHaveAttribute("aria-disabled", "true");
    expect(enlace).toHaveAttribute("tabindex", "-1");
    expect(enlace).toHaveClass("pointer-events-none");
  });
});
