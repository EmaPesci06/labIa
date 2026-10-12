import { afterEach, describe, expect, it, vi } from "vitest";

import { nombreVisible, obtenerSesion } from "./sesion";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => false,
  crearClienteServidor: async () => {
    throw new Error("no debería pedirse");
  },
}));
// `cache` de React solo existe en el servidor; en el test devuelve la función tal cual.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T extends (...args: never[]) => unknown>(f: T) => f,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("nombreVisible", () => {
  it("une nombre y apellido", () => {
    expect(nombreVisible("Laura", "Fernández", "l@x.com")).toBe("Laura Fernández");
  });
  it("sin nombre usa lo que va antes de la @", () => {
    expect(nombreVisible(null, null, "laura@x.com")).toBe("laura");
  });
  it("sin nada usa un texto neutro", () => {
    expect(nombreVisible(null, null, null)).toBe("Tu cuenta");
  });
});

describe("obtenerSesion", () => {
  it("sin Supabase configurado y sin sesión falsa devuelve null", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    expect(await obtenerSesion()).toBeNull();
  });

  it("en desarrollo, LABIA_ROL_DEV arma una sesión falsa", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_ID_DEV", "abc");
    const sesion = await obtenerSesion();
    expect(sesion).toMatchObject({ rol: "profesional", usuario: { id: "abc" } });
  });

  it("en producción ignora LABIA_ROL_DEV", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    expect(await obtenerSesion()).toBeNull();
  });

  it("en producción solo la respeta con LABIA_PERMITIR_ROL_DEV=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "cliente");
    vi.stubEnv("LABIA_PERMITIR_ROL_DEV", "1");
    expect(await obtenerSesion()).toMatchObject({ rol: "cliente" });
  });
});
