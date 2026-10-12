import { describe, expect, it } from "vitest";

import {
  decidirAcceso,
  esRutaPublicaDeApp,
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
    expect(decidirAcceso("/mis-trabajos", "?x=1", null)).toEqual({
      tipo: "redirigir",
      destino: "/ingresar?volver=%2Fmis-trabajos%3Fx%3D1",
    });
  });

  it("rutas con nombre parecido a las públicas no son públicas", () => {
    for (const ruta of ["/buscarX", "/profesionalesX", "/inicio-viejo"]) {
      expect(esRutaPublicaDeApp(ruta)).toBe(false);
    }
  });

  it("/cuenta sin sesión redirige a ingresar", () => {
    expect(decidirAcceso("/cuenta", "", null)).toEqual({
      tipo: "redirigir",
      destino: "/ingresar?volver=%2Fcuenta",
    });
  });

  it("inicio, búsqueda y perfiles se ven sin sesión y con cualquier rol salvo admin", () => {
    for (const ruta of ["/inicio", "/buscar", "/profesionales/abc"]) {
      for (const rol of [null, "cliente", "profesional"] as const) {
        expect(decidirAcceso(ruta, "?oficio=gas", rol)).toEqual({ tipo: "pasar" });
      }
      expect(decidirAcceso(ruta, "", "admin")).toEqual({
        tipo: "redirigir",
        destino: "/admin/verificaciones",
      });
    }
  });

  it("/admin responde 404 a un cliente, a un profesional y a quien no ingresó", () => {
    for (const rol of ["cliente", "profesional", null] as const) {
      expect(decidirAcceso("/admin/verificaciones", "", rol)).toEqual({ tipo: "no-encontrada" });
    }
  });

  it("/admin deja pasar al admin", () => {
    expect(decidirAcceso("/admin/reportes", "", "admin")).toEqual({ tipo: "pasar" });
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
