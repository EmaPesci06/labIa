import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Boton } from "./Boton";

describe("Boton", () => {
  it("principal normal: turquesa, texto sobre-accion, alto 52 y radio 18", () => {
    render(<Boton>Postularme</Boton>);
    const boton = screen.getByRole("button", { name: "Postularme" });
    expect(boton).toHaveClass("bg-accion", "text-sobre-accion", "min-h-[52px]", "rounded-boton");
    expect(boton).toHaveAttribute("type", "button");
  });

  it("principal grande: alto 56 y texto 18", () => {
    render(<Boton tamano="grande">Buscar</Boton>);
    const boton = screen.getByRole("button", { name: "Buscar" });
    expect(boton).toHaveClass("min-h-14", "text-lg", "bg-accion");
  });

  it("las variantes viejas siguen funcionando: cliente, profesional y exito son principal", () => {
    render(
      <>
        <Boton variante="cliente">Uno</Boton>
        <Boton variante="profesional">Dos</Boton>
        <Boton variante="exito">Tres</Boton>
      </>,
    );
    for (const nombre of ["Uno", "Dos", "Tres"]) {
      expect(screen.getByRole("button", { name: nombre })).toHaveClass("bg-accion");
    }
  });

  it("secundario: borde de 3 px color texto y fondo transparente", () => {
    render(<Boton variante="secundario">Cancelar</Boton>);
    const boton = screen.getByRole("button", { name: "Cancelar" });
    expect(boton).toHaveClass("border-[3px]", "border-texto", "bg-transparent");
    expect(boton).not.toHaveClass("bg-accion");
  });

  it("enlace: texto en negrita con subrayado, sin tamaño de botón", () => {
    render(<Boton variante="enlace">Olvidé mi contraseña</Boton>);
    const boton = screen.getByRole("button", { name: "Olvidé mi contraseña" });
    expect(boton).toHaveClass("font-bold", "text-texto", "underline", "min-h-11");
    expect(boton).not.toHaveClass("rounded-boton");
    expect(boton).not.toHaveClass("bg-accion");
  });

  it("fantasma (nombre viejo) es enlace", () => {
    render(<Boton variante="fantasma">Ver más</Boton>);
    expect(screen.getByRole("button", { name: "Ver más" })).toHaveClass("underline");
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

  it("peligro usa el token de error en borde y texto, y reenvía el ref al botón", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <Boton variante="peligro" ref={ref}>
        Cancelar trabajo
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Cancelar trabajo" });
    expect(boton).toHaveClass("border-error", "text-error");
    expect(boton).not.toHaveClass("bg-error");
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
    expect(enlace).toHaveClass("border-texto");
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
