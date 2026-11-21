import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatearDistancia } from "@/lib/formato";

import { Chip, GrupoChips } from "./Chip";
import { Distancia } from "./Distancia";
import { Encabezado } from "./Encabezado";

describe("Encabezado", () => {
  it("por defecto es turquesa, con h1 y bordes inferiores redondeados", () => {
    render(<Encabezado titulo="Mi perfil" />);
    const encabezado = screen.getByRole("banner");
    expect(encabezado).toHaveAttribute("data-encabezado", "turquesa");
    expect(encabezado).toHaveClass("bg-encabezado", "text-sobre-encabezado", "rounded-b-[28px]");
    expect(screen.getByRole("heading", { level: 1, name: "Mi perfil" })).toBeInTheDocument();
  });

  it("variante equipo para el panel de admin", () => {
    render(<Encabezado variante="equipo" titulo="Verificaciones" />);
    expect(screen.getByRole("banner")).toHaveClass("bg-equipo", "text-sobre-encabezado");
  });

  it("variante destacado: texto azul noche", () => {
    render(<Encabezado variante="destacado" titulo="Trabajos para vos" />);
    const encabezado = screen.getByRole("banner");
    expect(encabezado).toHaveAttribute("data-encabezado", "destacado");
    expect(encabezado).toHaveClass("bg-destacado", "text-sobre-destacado");
  });

  it("variante plano: sin bloque de color ni redondeo", () => {
    render(<Encabezado variante="plano" titulo="Mis postulaciones" />);
    const encabezado = screen.getByRole("banner");
    expect(encabezado).toHaveAttribute("data-encabezado", "plano");
    expect(encabezado).toHaveClass("bg-transparent", "text-texto");
    expect(encabezado).not.toHaveClass("rounded-b-[28px]");
  });

  it("volver es un enlace de al menos 44 px, con 'Volver' por defecto", () => {
    render(<Encabezado titulo="Trabajo" volver={{ href: "/trabajos" }} />);
    const enlace = screen.getByRole("link", { name: "Volver" });
    expect(enlace).toHaveAttribute("href", "/trabajos");
    expect(enlace).toHaveClass("min-h-11");
  });

  it("acepta descripción y contenido (chips, filtros)", () => {
    render(
      <Encabezado variante="destacado" titulo="Trabajos" descripcion="Cerca de vos">
        <p>Contenido extra</p>
      </Encabezado>,
    );
    expect(screen.getByText("Cerca de vos")).toBeInTheDocument();
    expect(screen.getByText("Contenido extra")).toBeInTheDocument();
  });

  it("un chip elegido dentro de un encabezado destacado pasa a azul noche con texto blanco", () => {
    render(
      <Encabezado variante="destacado" titulo="Trabajos">
        <GrupoChips
          tipo="unica"
          etiqueta="Oficio"
          valor="todos"
          onChange={() => {}}
          opciones={[
            { valor: "todos", etiqueta: "Todos" },
            { valor: "gas", etiqueta: "Gas" },
          ]}
        />
      </Encabezado>,
    );
    const elegido = screen.getByRole("radio", { name: "Todos" });
    expect(elegido).toHaveClass(
      "bg-secondary",
      "en-encabezado:bg-accion",
      "en-encabezado:text-sobre-accion",
    );
    const sinElegir = screen.getByRole("radio", { name: "Gas" });
    expect(sinElegir).toHaveClass("bg-card", "en-encabezado:bg-fondo");
  });

  it("un chip suelto (fuera de un encabezado) elegido queda destacado con texto azul noche", () => {
    render(<Chip seleccionado>Gas</Chip>);
    expect(screen.getByRole("button", { name: "Gas" })).toHaveClass(
      "bg-secondary",
      "text-secondary-foreground",
    );
  });
});

describe("Distancia", () => {
  it("muestra la distancia con el formato de la app en una pastilla destacado", () => {
    render(<Distancia km={1.2} />);
    const texto = screen.getByText(formatearDistancia(1.2));
    expect(texto).toHaveClass("bg-destacado", "text-sobre-destacado", "rounded-full");
  });

  it("admite sufijo", () => {
    render(<Distancia km={0.8} sufijo="de vos" />);
    expect(screen.getByText(`${formatearDistancia(0.8)} de vos`)).toBeInTheDocument();
  });
});
