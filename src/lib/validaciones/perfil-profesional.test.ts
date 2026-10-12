import { describe, expect, it } from "vitest";

import { erroresPorCampo } from "./auth";
import {
  esRutaFotoPerfil,
  esRutaFotoTrabajo,
  esquemaCuentaNueva,
  esquemaPerfilProfesional,
  leerPerfilProfesional,
  separarNombre,
} from "./perfil-profesional";

const valido = {
  nombreCompleto: "Martín Gómez",
  whatsapp: "223 555-0000",
  barrioId: "51",
  oficios: ["plomeria"],
  especialidades: "",
  todaLaCiudad: false,
  zonas: ["17", "51"],
  aniosExperiencia: "12",
  matricula: "",
  descripcion: "",
  disponibilidad: "",
  fotoPerfil: "",
  fotosTrabajos: [] as string[],
};

describe("esquemaPerfilProfesional", () => {
  it("acepta un perfil completo y normaliza WhatsApp, nombre y números", () => {
    const r = esquemaPerfilProfesional.parse(valido);
    expect(r.whatsapp).toBe("+5492235550000");
    expect(r.nombre).toBe("Martín");
    expect(r.apellido).toBe("Gómez");
    expect(r.barrioId).toBe(51);
    expect(r.zonas).toEqual([17, 51]);
    expect(r.aniosExperiencia).toBe(12);
    expect(r.matricula).toBeNull();
  });

  it("pide nombre y apellido", () => {
    const r = esquemaPerfilProfesional.safeParse({ ...valido, nombreCompleto: "Martín" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error).nombreCompleto).toBe("Ingresá tu nombre y apellido.");
    }
  });

  it("rechaza un WhatsApp inválido con un mensaje en castellano", () => {
    const r = esquemaPerfilProfesional.safeParse({ ...valido, whatsapp: "123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error).whatsapp).toMatch(/WhatsApp/);
  });

  it("exige al menos un oficio y rechaza oficios inventados", () => {
    expect(esquemaPerfilProfesional.safeParse({ ...valido, oficios: [] }).success).toBe(false);
    expect(esquemaPerfilProfesional.safeParse({ ...valido, oficios: ["hacker"] }).success).toBe(
      false,
    );
  });

  it("el gasista no avanza sin matrícula, los demás sí", () => {
    const gas = esquemaPerfilProfesional.safeParse({ ...valido, oficios: ["gas", "plomeria"] });
    expect(gas.success).toBe(false);
    if (!gas.success) {
      expect(erroresPorCampo(gas.error).matricula).toBe(
        "La matrícula es obligatoria para gasistas.",
      );
    }
    expect(
      esquemaPerfilProfesional.safeParse({ ...valido, oficios: ["gas"], matricula: "MG-123" })
        .success,
    ).toBe(true);
    expect(esquemaPerfilProfesional.safeParse({ ...valido, oficios: ["pintura"] }).success).toBe(
      true,
    );
  });

  it("'Toda la ciudad' reemplaza a los barrios y no exige zonas", () => {
    const r = esquemaPerfilProfesional.parse({ ...valido, todaLaCiudad: true });
    expect(r.zonas).toEqual([]);
    expect(
      esquemaPerfilProfesional.parse({ ...valido, todaLaCiudad: true, zonas: [] }).todaLaCiudad,
    ).toBe(true);
  });

  it("sin 'Toda la ciudad' hace falta al menos un barrio, y como máximo 10", () => {
    expect(esquemaPerfilProfesional.safeParse({ ...valido, zonas: [] }).success).toBe(false);
    const once = Array.from({ length: 11 }, (_, i) => String(i + 1));
    expect(esquemaPerfilProfesional.safeParse({ ...valido, zonas: once }).success).toBe(false);
    const diez = once.slice(0, 10);
    expect(esquemaPerfilProfesional.safeParse({ ...valido, zonas: diez }).success).toBe(true);
  });

  it("limita años (0 a 60), descripción (500) y textos cortos (120)", () => {
    expect(esquemaPerfilProfesional.safeParse({ ...valido, aniosExperiencia: "61" }).success).toBe(
      false,
    );
    expect(esquemaPerfilProfesional.safeParse({ ...valido, aniosExperiencia: "-1" }).success).toBe(
      false,
    );
    expect(esquemaPerfilProfesional.safeParse({ ...valido, aniosExperiencia: "0" }).success).toBe(
      true,
    );
    expect(
      esquemaPerfilProfesional.safeParse({ ...valido, descripcion: "a".repeat(501) }).success,
    ).toBe(false);
    expect(
      esquemaPerfilProfesional.safeParse({ ...valido, disponibilidad: "a".repeat(121) }).success,
    ).toBe(false);
    expect(
      esquemaPerfilProfesional.safeParse({ ...valido, especialidades: "a".repeat(121) }).success,
    ).toBe(false);
  });

  it("no acepta más de 10 fotos de trabajos", () => {
    const fotos = Array.from({ length: 11 }, (_, i) => `trabajos-hechos/u/${i}.jpg`);
    expect(esquemaPerfilProfesional.safeParse({ ...valido, fotosTrabajos: fotos }).success).toBe(
      false,
    );
  });
});

describe("leerPerfilProfesional", () => {
  it("lee listas repetidas y 'todaLaCiudad' del FormData", () => {
    const datos = new FormData();
    datos.set("nombreCompleto", "Ana Paz");
    datos.append("oficios", "gas");
    datos.append("oficios", "pintura");
    datos.append("zonas", "17");
    datos.set("todaLaCiudad", "true");
    const r = leerPerfilProfesional(datos);
    expect(r.oficios).toEqual(["gas", "pintura"]);
    expect(r.zonas).toEqual(["17"]);
    expect(r.todaLaCiudad).toBe(true);
    expect(r.fotosTrabajos).toEqual([]);
  });
});

describe("esquemaCuentaNueva", () => {
  it("pide email válido y contraseña de 8 o más caracteres", () => {
    expect(
      esquemaCuentaNueva.safeParse({ email: "a@b.com", contrasena: "12345678" }).success,
    ).toBe(true);
    expect(esquemaCuentaNueva.safeParse({ email: "a@b.com", contrasena: "123" }).success).toBe(
      false,
    );
    expect(esquemaCuentaNueva.safeParse({ email: "nada", contrasena: "12345678" }).success).toBe(
      false,
    );
  });
});

describe("rutas de fotos", () => {
  const uid = "0b0f6d6e-5c1a-4f5e-9b1f-2f6f8a1c3d4e";
  it("solo acepta rutas dentro de la carpeta propia", () => {
    expect(esRutaFotoPerfil(`perfiles/${uid}/1.jpg`, uid)).toBe(true);
    expect(esRutaFotoPerfil(`perfiles/otro/1.jpg`, uid)).toBe(false);
    expect(esRutaFotoPerfil(`perfiles/${uid}/../x.jpg`, uid)).toBe(false);
    expect(esRutaFotoTrabajo(`trabajos-hechos/${uid}/2-1.webp`, uid)).toBe(true);
    expect(esRutaFotoTrabajo(`perfiles/${uid}/2.jpg`, uid)).toBe(false);
    expect(esRutaFotoTrabajo(`trabajos-hechos/${uid}/2.jpg`, "no-es-uuid")).toBe(false);
  });
});

describe("separarNombre", () => {
  it("el apellido es todo lo que sigue al primer nombre", () => {
    expect(separarNombre("  Ana  María  de la Paz ")).toEqual({
      nombre: "Ana",
      apellido: "María de la Paz",
    });
  });
});
