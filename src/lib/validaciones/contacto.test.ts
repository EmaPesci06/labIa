import { describe, expect, it } from "vitest";

import { datosDeFormularioContacto, esquemaContacto } from "./contacto";

const PROFESIONAL = "11111111-1111-4111-8111-111111111111";
const TRABAJO = "22222222-2222-4222-8222-222222222222";

describe("esquemaContacto", () => {
  it("acepta un contacto desde el perfil sin trabajo", () => {
    expect(
      esquemaContacto.safeParse({ profesionalId: PROFESIONAL, origen: "perfil" }).success,
    ).toBe(true);
  });

  it("acepta un contacto desde una postulación con su trabajo", () => {
    expect(
      esquemaContacto.safeParse({
        profesionalId: PROFESIONAL,
        origen: "postulacion",
        trabajoId: TRABAJO,
      }).success,
    ).toBe(true);
  });

  it("pide el trabajo cuando el origen es postulación", () => {
    const r = esquemaContacto.safeParse({ profesionalId: PROFESIONAL, origen: "postulacion" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Falta el trabajo de la postulación.");
  });

  it("no acepta un trabajo cuando el origen es el perfil", () => {
    const r = esquemaContacto.safeParse({
      profesionalId: PROFESIONAL,
      origen: "perfil",
      trabajoId: TRABAJO,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Un contacto desde el perfil no lleva trabajo.");
  });

  it("rechaza un id que no es uuid y un origen desconocido, en castellano", () => {
    const id = esquemaContacto.safeParse({ profesionalId: "no-es-uuid", origen: "perfil" });
    expect(id.error?.issues[0]?.message).toBe("Ese perfil no existe.");
    const origen = esquemaContacto.safeParse({ profesionalId: PROFESIONAL, origen: "chat" });
    expect(origen.success).toBe(false);
  });
});

describe("datosDeFormularioContacto", () => {
  it("convierte el FormData y descarta los campos vacíos", () => {
    const datos = new FormData();
    datos.set("profesionalId", PROFESIONAL);
    datos.set("origen", "perfil");
    datos.set("trabajoId", "");
    expect(datosDeFormularioContacto(datos)).toEqual({
      profesionalId: PROFESIONAL,
      origen: "perfil",
      trabajoId: undefined,
    });
  });
});
