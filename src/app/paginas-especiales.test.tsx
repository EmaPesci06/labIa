import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SinConexion from "./(publico)/sin-conexion/page";
import ErrorDePagina from "./error";
import NoEncontrada from "./not-found";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("not-found", () => {
  it("dice que no encontramos la página y lleva al inicio", () => {
    render(<NoEncontrada />);
    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/inicio");
  });
});

describe("sin-conexion", () => {
  it("muestra el mensaje de la tarea", () => {
    render(<SinConexion />);
    expect(screen.getByRole("heading", { level: 1, name: "Sin conexión" })).toBeInTheDocument();
    expect(screen.getByText("Sin conexión. Revisá tu internet y volvé a intentar.")).toBeVisible();
  });
});

describe("error", () => {
  it("avisa del error y permite reintentar", () => {
    const retry = vi.fn();
    render(<ErrorDePagina error={new Error("x")} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Algo salió mal" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Reintentar" }).click();
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/inicio");
  });
});
