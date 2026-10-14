import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { erroresPorCampo } from "./auth";
import {
  BARRIOS_FRECUENTES,
  esquemaCompletarCliente,
  esquemaRegistroCliente,
  normalizarBusqueda,
  separarNombre,
} from "./registro-cliente";

const valido = {
  nombreCompleto: "Laura Fernández",
  whatsapp: "223 555 1234",
  email: "Laura@Correo.com ",
  contrasena: "unaclave123",
  barrio: "17",
};

describe("separarNombre", () => {
  it("la primera palabra es el nombre y el resto el apellido", () => {
    expect(separarNombre("Laura Fernández de Paz")).toEqual({
      nombre: "Laura",
      apellido: "Fernández de Paz",
    });
  });
  it("con una sola palabra no hay apellido", () => {
    expect(separarNombre("  Laura ")).toEqual({ nombre: "Laura", apellido: null });
  });
});

describe("esquemaRegistroCliente", () => {
  it("normaliza email, WhatsApp y barrio", () => {
    const datos = esquemaRegistroCliente.parse(valido);
    expect(datos).toMatchObject({
      nombreCompleto: "Laura Fernández",
      whatsapp: "+5492235551234",
      email: "laura@correo.com",
      barrio: 17,
    });
  });

  it("cuatro formas de escribir el mismo celular dan el mismo E.164", () => {
    const formas = ["223 555-1234", "(0223) 15 555 1234", "+54 9 223 555 1234", "5551234"];
    const guardados = formas.map(
      (whatsapp) => esquemaRegistroCliente.parse({ ...valido, whatsapp }).whatsapp,
    );
    expect(new Set(guardados)).toEqual(new Set(["+5492235551234"]));
  });

  it("el WhatsApp inválido da el mensaje del ejemplo", () => {
    const r = esquemaRegistroCliente.safeParse({ ...valido, whatsapp: "12345" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error).whatsapp).toBe("Revisá el número. Ej.: 223 555 1234");
    }
  });

  it("no se puede terminar sin barrio ni WhatsApp", () => {
    const r = esquemaRegistroCliente.safeParse({ ...valido, whatsapp: "", barrio: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errores = erroresPorCampo(r.error);
      expect(errores.whatsapp).toBe("Ingresá tu número de WhatsApp.");
      expect(errores.barrio).toBe("Elegí tu barrio.");
    }
  });

  it("rechaza barrios que no son un id válido", () => {
    for (const barrio of ["0", "-3", "abc", "1.5", "99999", "17; drop table"]) {
      expect(esquemaRegistroCliente.safeParse({ ...valido, barrio }).success).toBe(false);
    }
  });

  it("valida nombre (2 a 60), email y contraseña (mínimo 8)", () => {
    const errores = (cambios: object) => {
      const r = esquemaRegistroCliente.safeParse({ ...valido, ...cambios });
      return r.success ? {} : erroresPorCampo<string>(r.error);
    };
    expect(errores({ nombreCompleto: "L" }).nombreCompleto).toBeDefined();
    expect(errores({ nombreCompleto: "a".repeat(61) }).nombreCompleto).toBeDefined();
    expect(errores({ email: "laura@" }).email).toBeDefined();
    expect(errores({ contrasena: "corta" }).contrasena).toBe(
      "La contraseña tiene que tener al menos 8 caracteres.",
    );
  });
});

describe("esquemaCompletarCliente", () => {
  it("pide solo WhatsApp y barrio", () => {
    expect(esquemaCompletarCliente.parse({ whatsapp: "2235551234", barrio: "51" })).toEqual({
      whatsapp: "+5492235551234",
      barrio: 51,
    });
    expect(esquemaCompletarCliente.safeParse({ whatsapp: "", barrio: "" }).success).toBe(false);
  });
});

describe("normalizarBusqueda", () => {
  it("ignora acentos y mayúsculas", () => {
    expect(normalizarBusqueda("  Chauvín ")).toBe("chauvin");
    expect(normalizarBusqueda("CONSTITUCIÓN")).toBe("constitucion");
  });
});

describe("BARRIOS_FRECUENTES", () => {
  it("coinciden en id y nombre con la tabla de barrios", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261011190100_barrios_mar_del_plata.sql"),
      "utf8",
    );
    for (const { id, nombre } of BARRIOS_FRECUENTES) {
      expect(sql).toContain(`(${id}, '${nombre}',`);
    }
    expect(BARRIOS_FRECUENTES).toHaveLength(7);
  });
});
