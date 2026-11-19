import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ResultadoProfesional } from "@/lib/busqueda";
import { formatearDistancia } from "@/lib/formato";

import { nombreCorto, TarjetaProfesional } from "./TarjetaProfesional";

const base: ResultadoProfesional = {
  usuarioId: "abc",
  nombre: "Martín",
  apellidoInicial: "G",
  fotoPath: null,
  oficios: ["gas"],
  aniosExperiencia: 12,
  zonasTexto: "La Perla, Centro",
  promedio: 4.9,
  cantidadResenas: 10,
  identidadVerificada: true,
  antecedentesOk: true,
  matriculado: true,
  distanciaKm: 1.2,
};

describe("TarjetaProfesional", () => {
  it("es un link al perfil con nombre, línea, puntaje, distancia e insignias", () => {
    render(<TarjetaProfesional profesional={base} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/profesionales/abc");
    expect(screen.getByText("Martín G.")).toBeInTheDocument();
    expect(screen.getByText("Gasista · 12 años")).toBeInTheDocument();
    expect(screen.getByText("4,9 en 10 reseñas")).toBeInTheDocument();
    expect(screen.getByText("a 1,2 km")).toBeInTheDocument();
    expect(screen.getByText("Identidad verificada")).toBeInTheDocument();
    expect(screen.getByText("Sin antecedentes")).toBeInTheDocument();
    expect(screen.getByText("Matriculado")).toBeInTheDocument();
  });

  it("sin matrícula ni reseñas no muestra la insignia ni el puntaje", () => {
    render(<TarjetaProfesional profesional={{ ...base, matriculado: false, promedio: null }} />);
    expect(screen.queryByText("Matriculado")).not.toBeInTheDocument();
    expect(screen.getByText("Sin reseñas todavía")).toBeInTheDocument();
  });

  it("la distancia se muestra con el formato de la app y cambia con el dato", () => {
    const { rerender } = render(<TarjetaProfesional profesional={base} />);
    expect(screen.getByText(formatearDistancia(1.2))).toBeInTheDocument();
    rerender(<TarjetaProfesional profesional={{ ...base, distanciaKm: 9 }} />);
    expect(screen.getByText(formatearDistancia(9))).toBeInTheDocument();
  });
});

describe("nombreCorto", () => {
  it("agrega el punto una sola vez", () => {
    expect(nombreCorto("Martín", "G")).toBe("Martín G.");
    expect(nombreCorto("Martín", "G.")).toBe("Martín G.");
  });
});
