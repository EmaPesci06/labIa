import { render, screen } from "@testing-library/react";
import { Hammer } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Aviso } from "./Aviso";
import { Avatar, iniciales } from "./Avatar";
import { EtiquetaMono } from "./EtiquetaMono";
import { Insignia } from "./Insignia";
import { Tarjeta } from "./Tarjeta";
import { Vacio } from "./Vacio";

describe("Insignia", () => {
  it("tiene el texto por defecto de cada variante", () => {
    render(
      <>
        <Insignia variante="verificada" />
        <Insignia variante="antecedentes" />
        <Insignia variante="matriculado" />
        <Insignia variante="urgencia" />
        <Insignia variante="exito" />
      </>,
    );
    for (const texto of [
      "Identidad verificada",
      "Sin antecedentes",
      "Matriculado",
      "Lo antes posible",
      "Contratado",
    ]) {
      expect(screen.getByText(texto)).toBeInTheDocument();
    }
  });

  it("verificación con borde turquesa sobre superficie; matrícula en sol", () => {
    render(
      <>
        <Insignia variante="verificada" />
        <Insignia variante="matriculado" />
      </>,
    );
    expect(screen.getByText("Identidad verificada")).toHaveClass(
      "bg-card",
      "border-primary",
      "font-bold",
      "text-xs",
    );
    expect(screen.getByText("Matriculado")).toHaveClass(
      "bg-secondary",
      "text-secondary-foreground",
    );
  });

  it("admite texto propio", () => {
    render(<Insignia variante="urgencia">Esta semana</Insignia>);
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
  });
});

describe("Tarjeta", () => {
  it("radio de shadcn, padding 16, superficie y sin borde por defecto", () => {
    render(
      <>
        <Tarjeta>Sola</Tarjeta>
        <Tarjeta borde como="article">
          Con borde
        </Tarjeta>
      </>,
    );
    const sola = screen.getByText("Sola");
    expect(sola).toHaveClass("rounded-xl", "p-4", "bg-card");
    expect(sola).not.toHaveClass("border-2", "ring-1");
    const conBorde = screen.getByText("Con borde");
    expect(conBorde.closest("article")).not.toBeNull();
    expect(conBorde).toHaveClass("border-2", "border-foreground");
  });
});

describe("Tarjeta con elemento propio", () => {
  it("la sección conserva aria-labelledby y queda como región con nombre", () => {
    render(
      <Tarjeta como="section" aria-labelledby="titulo-seccion">
        <h2 id="titulo-seccion">Acceso</h2>
      </Tarjeta>,
    );
    expect(screen.getByRole("region", { name: "Acceso" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("calcula las iniciales", () => {
    expect(iniciales("Martín Gómez")).toBe("MG");
    expect(iniciales("laura")).toBe("L");
    expect(iniciales("  Ana María  López ")).toBe("AL");
  });

  it("muestra las iniciales con el nombre como etiqueta, sobre turquesa con borde sol", () => {
    render(<Avatar nombre="Martín Gómez" tamano={84} />);
    const avatar = screen.getByRole("img", { name: "Martín Gómez" });
    expect(avatar).toHaveTextContent("MG");
    expect(avatar).toHaveClass("size-[84px]", "bg-primary", "border-secondary");
  });

  it("con foto muestra la imagen", () => {
    render(<Avatar nombre="Laura F" src="/foto.jpg" />);
    expect(screen.getByAltText("Laura F")).toBeInTheDocument();
  });
});

describe("EtiquetaMono", () => {
  it("une las partes con puntos medios en mayúsculas", () => {
    render(<EtiquetaMono partes={["Gas", "La Perla", "hace 20 min", "a 0,8 km"]} />);
    const etiqueta = screen.getByText("Gas · La Perla · hace 20 min · a 0,8 km");
    expect(etiqueta).toHaveClass("uppercase", "tracking-[0.4px]", "font-bold");
  });
});

describe("Vacio", () => {
  it("muestra título, descripción y acción", () => {
    render(
      <Vacio
        icono={Hammer}
        titulo="Todavía no hay trabajos"
        descripcion="Publicá el primero."
        accion={<button type="button">Publicar</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Todavía no hay trabajos" })).toBeInTheDocument();
    expect(screen.getByText("Publicá el primero.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
  });
});

describe("Aviso (nota)", () => {
  it("es una nota con el mensaje, con borde turquesa", () => {
    render(<Aviso>Se comprometió con las normas de seguridad de Oficio Seguro.</Aviso>);
    expect(screen.getByRole("note")).toHaveTextContent("normas de seguridad de Oficio Seguro");
    expect(screen.getByRole("note")).toHaveClass("bg-card", "border-primary");
  });
});
