import { afterEach, describe, expect, it, vi } from "vitest";

import { obtenerSesion } from "./sesion";

vi.mock("next/server", () => ({ connection: async () => {} }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("obtenerSesion (sesión falsa de LAB-13)", () => {
  it("por defecto es cliente", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    expect((await obtenerSesion()).rol).toBe("cliente");
  });

  it("en desarrollo toma el rol y el id de las variables", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_ID_DEV", "abc");
    expect(await obtenerSesion()).toMatchObject({ rol: "profesional", id: "abc" });
  });

  it("en producción ignora LABIA_ROL_DEV", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_ID_DEV", "abc");
    expect(await obtenerSesion()).toMatchObject({ rol: "cliente", id: "demo-cliente" });
  });

  it("en producción solo la respeta con LABIA_PERMITIR_ROL_DEV=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_ID_DEV", "abc");
    vi.stubEnv("LABIA_PERMITIR_ROL_DEV", "1");
    expect(await obtenerSesion()).toMatchObject({ rol: "profesional", id: "abc" });
  });
});
