import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("OPCIONES_COOKIES_SESION", () => {
  it("fija sameSite lax, path raíz y httpOnly apagado (lo lee el navegador)", async () => {
    const { OPCIONES_COOKIES_SESION } = await import("./cookies");
    expect(OPCIONES_COOKIES_SESION).toMatchObject({
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    // Sin `name`: cambiaría la clave de la sesión y cerraría las sesiones vigentes.
    expect(OPCIONES_COOKIES_SESION.name).toBeUndefined();
  });

  it("marca secure en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { OPCIONES_COOKIES_SESION } = await import("./cookies");
    expect(OPCIONES_COOKIES_SESION.secure).toBe(true);
  });

  it("no marca secure en desarrollo, para que http://localhost funcione", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { OPCIONES_COOKIES_SESION } = await import("./cookies");
    expect(OPCIONES_COOKIES_SESION.secure).toBe(false);
  });
});
