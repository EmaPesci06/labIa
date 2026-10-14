import { describe, expect, it } from "vitest";

import {
  decidirAcceso,
  esRutaConSesion,
  inicioDelRol,
  necesitaSesion,
  rolExigido,
  volverSeguro,
} from "./rutas";

describe("inicioDelRol", () => {
  it("manda a cada rol a su pantalla", () => {
    expect(inicioDelRol("cliente")).toBe("/inicio");
    expect(inicioDelRol("profesional")).toBe("/trabajos");
    expect(inicioDelRol("admin")).toBe("/admin/verificaciones");
  });
});

describe("decidirAcceso", () => {
  it("una ruta de (app) sin sesión redirige a /ingresar con volver", () => {
    expect(decidirAcceso("/buscar", "?oficio=gas", null)).toEqual({
      tipo: "redirigir",
      destino: "/ingresar?volver=%2Fbuscar%3Foficio%3Dgas",
    });
  });

  it("/admin responde 404 a un cliente, a un profesional y a quien no ingresó", () => {
    for (const rol of ["cliente", "profesional", null] as const) {
      expect(decidirAcceso("/admin/verificaciones", "", rol)).toEqual({ tipo: "no-encontrada" });
    }
  });

  it("/admin deja pasar al admin", () => {
    expect(decidirAcceso("/admin/reportes", "", "admin")).toEqual({ tipo: "pasar" });
  });

  it("/trabajos/nuevo exige sesión de cliente y conserva el oficio al ingresar", () => {
    expect(esRutaConSesion("/trabajos/nuevo")).toBe(true);
    expect(rolExigido("/trabajos/nuevo")).toBe("cliente");
    expect(decidirAcceso("/trabajos/nuevo", "?oficio=gas", null)).toEqual({
      tipo: "redirigir",
      destino: "/ingresar?volver=%2Ftrabajos%2Fnuevo%3Foficio%3Dgas",
    });
    expect(decidirAcceso("/trabajos/nuevo", "", "cliente")).toEqual({ tipo: "pasar" });
  });

  it("un profesional no entra a las rutas de cliente y viceversa", () => {
    expect(decidirAcceso("/trabajos/nuevo", "", "profesional")).toEqual({
      tipo: "redirigir",
      destino: "/trabajos",
    });
    expect(decidirAcceso("/mis-trabajos", "", "profesional")).toMatchObject({ tipo: "redirigir" });
    expect(decidirAcceso("/trabajos", "", "cliente")).toEqual({
      tipo: "redirigir",
      destino: "/inicio",
    });
  });

  it("el detalle de un trabajo sirve para los dos roles", () => {
    expect(rolExigido("/trabajos/abc")).toBeNull();
    expect(decidirAcceso("/trabajos/abc", "", "cliente")).toEqual({ tipo: "pasar" });
    expect(decidirAcceso("/trabajos/abc", "", "profesional")).toEqual({ tipo: "pasar" });
  });

  it("un admin en (app) va a su panel", () => {
    expect(decidirAcceso("/inicio", "", "admin")).toEqual({
      tipo: "redirigir",
      destino: "/admin/verificaciones",
    });
  });

  it("con sesión, / y /ingresar llevan al inicio del rol", () => {
    expect(decidirAcceso("/", "", "cliente")).toEqual({ tipo: "redirigir", destino: "/inicio" });
    expect(decidirAcceso("/ingresar", "", "profesional")).toEqual({
      tipo: "redirigir",
      destino: "/trabajos",
    });
    expect(decidirAcceso("/", "", "admin")).toEqual({
      tipo: "redirigir",
      destino: "/admin/verificaciones",
    });
  });

  it("las rutas públicas pasan sin sesión", () => {
    for (const ruta of ["/", "/ingresar", "/registro/cliente", "/normas", "/restablecer"]) {
      expect(decidirAcceso(ruta, "", null)).toEqual({ tipo: "pasar" });
    }
  });

  it("no confunde prefijos parecidos", () => {
    expect(decidirAcceso("/trabajos-viejos", "", null)).toEqual({ tipo: "pasar" });
    expect(necesitaSesion("/normas")).toBe(false);
  });
});

describe("volverSeguro", () => {
  it("acepta rutas internas", () => {
    expect(volverSeguro("/buscar?oficio=gas")).toBe("/buscar?oficio=gas");
    expect(volverSeguro("/profesionales/123")).toBe("/profesionales/123");
  });

  it("rechaza URLs externas y trucos", () => {
    for (const malo of [
      "https://malo.com",
      "//malo.com",
      "/\\malo.com",
      "javascript:alert(1)",
      "/ok\r\nSet-Cookie: x=1",
      "buscar",
      "/ingresar",
      "/api/auth/callback",
      null,
      undefined,
      42,
    ]) {
      expect(volverSeguro(malo)).toBeNull();
    }
  });
});
