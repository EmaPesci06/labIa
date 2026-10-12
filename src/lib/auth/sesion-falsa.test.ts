import { afterEach, describe, expect, it, vi } from "vitest";

import { rolFalso } from "./sesion-falsa";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rolFalso", () => {
  it("en desarrollo usa LABIA_ROL_DEV", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    expect(rolFalso()).toBe("profesional");
  });

  it("en producción necesita LABIA_PERMITIR_ROL_DEV=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "cliente");
    expect(rolFalso()).toBeNull();
    vi.stubEnv("LABIA_PERMITIR_ROL_DEV", "1");
    expect(rolFalso()).toBe("cliente");
  });

  it("con VERCEL_ENV=production se ignora siempre, aunque estén las dos variables", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_PERMITIR_ROL_DEV", "1");
    expect(rolFalso()).toBeNull();
    vi.stubEnv("NODE_ENV", "development");
    expect(rolFalso()).toBeNull();
  });
});
