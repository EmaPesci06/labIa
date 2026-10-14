import { describe, expect, it } from "vitest";

import { esquemaPerfilProfesional } from "@/lib/validaciones/perfil";

import {
  autorResena,
  descripcionCorta,
  lineaOficio,
  nombreMostrado,
  separarEspecialidades,
  textoCantidadResenas,
  textoPuntaje,
  tituloPerfil,
} from "./datos";

describe("nombreMostrado", () => {
  it("usa el apellido completo si viene", () => {
    expect(nombreMostrado("Martín", "Gómez", "G")).toBe("Martín Gómez");
  });
  it("usa la inicial con punto si no viene el apellido", () => {
    expect(nombreMostrado("Martín", null, "G")).toBe("Martín G.");
  });
  it("sin apellido ni inicial deja solo el nombre", () => {
    expect(nombreMostrado("Martín", null, null)).toBe("Martín");
  });
});

describe("textos del perfil", () => {
  it("arma la línea de oficio y experiencia", () => {
    expect(lineaOficio(["gas", "plomeria"], 12)).toBe("Gasista · 12 años de experiencia");
    expect(lineaOficio(["gas"], 1)).toBe("Gasista · 1 año de experiencia");
    expect(lineaOficio(["gas"], null)).toBe("Gasista");
  });
  it("arma el título de la pestaña", () => {
    expect(tituloPerfil("Martín G.", ["gas"])).toBe("Martín G. · Gasista en Mar del Plata · LabÍA");
  });
  it("recorta la descripción larga", () => {
    expect(descripcionCorta("Martín G.", ["gas"], "a".repeat(300)).length).toBeLessThanOrEqual(160);
    expect(descripcionCorta("Martín G.", ["gas"], null)).toContain("gas");
  });
  it("formatea reseñas y autores", () => {
    expect(autorResena("Laura", "F")).toBe("Laura F.");
    expect(autorResena(null, null)).toBe("Cliente de LabÍA");
    expect(textoPuntaje(1)).toBe("1 estrella");
    expect(textoPuntaje(5)).toBe("5 estrellas");
    expect(textoCantidadResenas(1)).toBe("1 reseña");
    expect(textoCantidadResenas(23)).toBe("23 reseñas");
  });
  it("separa las especialidades", () => {
    expect(separarEspecialidades("Pérdidas de gas, Calefactores; ")).toEqual([
      "Pérdidas de gas",
      "Calefactores",
    ]);
    expect(separarEspecialidades(null)).toEqual([]);
  });
});

describe("esquemaPerfilProfesional", () => {
  const base = {
    oficios: ["gas"],
    especialidades: "",
    descripcion: " Gasista matriculado. ",
    aniosExperiencia: "12",
    disponibilidad: "",
    todaLaCiudad: false,
    zonas: [51],
  };
  it("acepta un perfil válido y limpia los vacíos", () => {
    const r = esquemaPerfilProfesional.parse(base);
    expect(r.descripcion).toBe("Gasista matriculado.");
    expect(r.especialidades).toBeNull();
    expect(r.aniosExperiencia).toBe(12);
  });
  it("exige al menos un oficio", () => {
    const r = esquemaPerfilProfesional.safeParse({ ...base, oficios: [] });
    expect(r.error?.issues[0]?.message).toBe("Elegí al menos un oficio.");
  });
  it("exige zona o toda la ciudad", () => {
    const r = esquemaPerfilProfesional.safeParse({ ...base, zonas: [] });
    expect(r.error?.issues[0]?.path).toEqual(["zonas"]);
    expect(
      esquemaPerfilProfesional.safeParse({ ...base, zonas: [], todaLaCiudad: true }).success,
    ).toBe(true);
  });
  it("valida los años", () => {
    expect(esquemaPerfilProfesional.safeParse({ ...base, aniosExperiencia: "abc" }).success).toBe(
      false,
    );
    expect(esquemaPerfilProfesional.safeParse({ ...base, aniosExperiencia: "71" }).success).toBe(
      false,
    );
    expect(
      esquemaPerfilProfesional.parse({ ...base, aniosExperiencia: "" }).aniosExperiencia,
    ).toBeNull();
  });
});
