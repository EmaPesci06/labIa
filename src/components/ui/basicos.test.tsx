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

  it("usa los tokens: azul suave y naranja suave", () => {
    render(
      <>
        <Insignia variante="verificada" />
        <Insignia variante="matriculado" />
      </>,
    );
    expect(screen.getByText("Identidad verificada")).toHaveClass(
      "bg-azul-suave",
      "font-bold",
      "text-xs",
    );
    expect(screen.getByText("Matriculado")).toHaveClass(
      "bg-naranja-suave",
      "text-sobre-naranja-suave",
    );
  });

  it("admite texto propio", () => {
    render(<Insignia variante="urgencia">Esta semana</Insignia>);
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
  });
});

describe("Tarjeta", () => {
  it("radio 18, padding 16 y variante con borde", () => {
    render(
      <>
        <Tarjeta>Sola</Tarjeta>
        <Tarjeta borde como="article">
          Con borde
        </Tarjeta>
      </>,
    );
    expect(screen.getByText("Sola")).toHaveClass("rounded-[18px]", "p-4", "bg-superficie");
    const conBorde = screen.getByText("Con borde");
    expect(conBorde.tagName).toBe("ARTICLE");
    expect(conBorde).toHaveClass("border");
  });
});

describe("Avatar", () => {
  it("calcula las iniciales", () => {
    expect(iniciales("Martín Gómez")).toBe("MG");
    expect(iniciales("laura")).toBe("L");
    expect(iniciales("  Ana María  López ")).toBe("AL");
  });

  it("muestra las iniciales con el nombre como etiqueta", () => {
    render(<Avatar nombre="Martín Gómez" tamano={84} />);
    const avatar = screen.getByRole("img", { name: "Martín Gómez" });
    expect(avatar).toHaveTextContent("MG");
    expect(avatar).toHaveClass("size-[84px]", "bg-azul");
  });

  it("con foto muestra la imagen", () => {
    render(<Avatar nombre="Laura F" src="/foto.jpg" />);
    expect(screen.getByAltText("Laura F")).toBeInTheDocument();
  });
});

describe("EtiquetaMono", () => {
  it("une las partes con puntos medios", () => {
    render(<EtiquetaMono partes={["Gas", "La Perla", "hace 20 min", "a 0,8 km"]} />);
    const etiqueta = screen.getByText("Gas · La Perla · hace 20 min · a 0,8 km");
    expect(etiqueta).toHaveClass("font-mono", "uppercase", "tracking-[0.4px]");
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

describe("Aviso", () => {
  it("es una nota con el mensaje", () => {
    render(<Aviso>Se comprometió con las normas de seguridad de LabÍA.</Aviso>);
    expect(screen.getByRole("note")).toHaveTextContent("normas de seguridad de LabÍA");
    expect(screen.getByRole("note")).toHaveClass("bg-azul-suave");
  });
});
