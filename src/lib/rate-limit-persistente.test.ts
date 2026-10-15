import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consumir, configurado, ip, sentry } = vi.hoisted(() => ({
  consumir: vi.fn(),
  configurado: { valor: true },
  ip: { valor: "190.1.2.3" },
  sentry: { captureException: vi.fn() },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/lib/ip-del-pedido", () => ({ ipDelPedido: async () => ip.valor }));
vi.mock("@/lib/rate-limit-servicio", () => ({ consumirCupoServicio: consumir }));
vi.mock("@/lib/supabase/servidor", () => ({ supabaseConfigurado: () => configurado.valor }));

import { reiniciarLimites } from "./rate-limit";
import {
  claveDeLimite,
  limitarPersistente,
  limitarPorIp,
  mensajeDeLimite,
} from "./rate-limit-persistente";

const regla = { maximo: 5, ventanaMs: 60_000 };
const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
const hmac = (t: string, secreto: string) => createHmac("sha256", secreto).update(t).digest("hex");

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_SECRET", "");
  consumir.mockReset();
  sentry.captureException.mockReset();
  reiniciarLimites();
  configurado.valor = true;
  ip.valor = "190.1.2.3";
});

describe("limitarPersistente", () => {
  it("cuenta con la clave hasheada, el máximo y la ventana en segundos", async () => {
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });

    const resultado = await limitarPersistente("ingreso:1.2.3.4", regla);

    expect(consumir).toHaveBeenCalledWith(sha256("ingreso:1.2.3.4"), 5, 60);
    expect(resultado).toEqual({ permitido: true, segundosParaReintentar: 0 });
  });

  it("nunca manda la clave en claro", async () => {
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    await limitarPersistente("registro:mail@ejemplo.com", regla);
    expect(consumir.mock.calls[0]?.[0]).not.toContain("mail@ejemplo.com");
    expect(consumir.mock.calls[0]?.[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("devuelve el bloqueo con los segundos que faltan", async () => {
    consumir.mockResolvedValue({ permitido: false, segundosParaReintentar: 42 });
    expect(await limitarPersistente("ingreso:x", regla)).toEqual({
      permitido: false,
      segundosParaReintentar: 42,
    });
  });

  it("si la base falla cae a memoria, reporta a Sentry sin la clave y sigue limitando", async () => {
    consumir.mockRejectedValue(new Error("caída"));
    const chica = { maximo: 1, ventanaMs: 60_000 };

    expect((await limitarPersistente("respaldo@mail.com", chica)).permitido).toBe(true);
    expect((await limitarPersistente("respaldo@mail.com", chica)).permitido).toBe(false);
    expect(sentry.captureException).toHaveBeenCalled();
    const mensaje = String(sentry.captureException.mock.calls[0]?.[0]);
    expect(mensaje).not.toContain("respaldo@mail.com");
  });

  it("la caída de consumir_cupo genera un evento de Sentry distinguible (tag y fingerprint propios)", async () => {
    consumir.mockRejectedValue(new Error("service key faltante"));

    await limitarPersistente("evento@mail.com", regla);

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const opciones = sentry.captureException.mock.calls[0]?.[1];
    expect(opciones).toMatchObject({
      level: "error",
      tags: { componente: "rate-limit", evento: "consumir-cupo-respaldo-memoria" },
      fingerprint: ["rate-limit-consumir-cupo-respaldo-memoria"],
    });
    expect(JSON.stringify(sentry.captureException.mock.calls[0])).not.toContain("evento@mail.com");
  });

  it("en producción sin RATE_LIMIT_SECRET lanza y no cuenta ni guarda una clave sin llave", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    await expect(limitarPersistente("ingreso:1.2.3.4", regla)).rejects.toThrow(
      /RATE_LIMIT_SECRET es obligatorio en producción/,
    );
    expect(consumir).not.toHaveBeenCalled();
  });

  it("en producción con RATE_LIMIT_SECRET cuenta normalmente con HMAC", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SECRET", "secreto-de-prueba");
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });

    await limitarPersistente("ingreso:1.2.3.4", regla);

    expect(consumir).toHaveBeenCalledWith(hmac("ingreso:1.2.3.4", "secreto-de-prueba"), 5, 60);
  });

  it("en preview o e2e sin secreto se mantiene sha256 (la CI no se rompe)", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });

    await limitarPersistente("ingreso:1.2.3.4", regla);

    expect(consumir).toHaveBeenCalledWith(sha256("ingreso:1.2.3.4"), 5, 60);
  });

  it("sin Supabase configurado en producción no exige el secreto (no se guarda nada)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    configurado.valor = false;

    expect((await limitarPersistente("sin-config-prod", regla)).permitido).toBe(true);
    expect(consumir).not.toHaveBeenCalled();
  });

  it("sin Supabase configurado usa solo la memoria", async () => {
    configurado.valor = false;
    const chica = { maximo: 1, ventanaMs: 60_000 };

    expect((await limitarPersistente("sin-config", chica)).permitido).toBe(true);
    expect((await limitarPersistente("sin-config", chica)).permitido).toBe(false);
    expect(consumir).not.toHaveBeenCalled();
  });
});

describe("limitarPorIp", () => {
  it("arma la clave con la acción y la IP del pedido", async () => {
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    await limitarPorIp("reenvio-ip", regla);
    expect(consumir).toHaveBeenCalledWith(sha256("reenvio-ip:190.1.2.3"), 5, 60);
  });
});

describe("mensajeDeLimite", () => {
  it("no muestra nada si el intento entra", () => {
    expect(mensajeDeLimite({ permitido: true, segundosParaReintentar: 0 })).toBeNull();
  });

  it("explica cuántos segundos esperar", () => {
    expect(mensajeDeLimite({ permitido: false, segundosParaReintentar: 30 })).toBe(
      "Hiciste demasiados intentos. Esperá 30 segundos y probá de nuevo.",
    );
  });
});

describe("claveDeLimite", () => {
  it("sin RATE_LIMIT_SECRET usa sha256", () => {
    expect(claveDeLimite("ingreso:1.2.3.4")).toBe(sha256("ingreso:1.2.3.4"));
  });

  it("con RATE_LIMIT_SECRET usa HMAC-SHA256 con ese secreto", () => {
    vi.stubEnv("RATE_LIMIT_SECRET", "secreto-de-prueba");
    expect(claveDeLimite("ingreso:1.2.3.4")).toBe(hmac("ingreso:1.2.3.4", "secreto-de-prueba"));
    expect(claveDeLimite("ingreso:1.2.3.4")).not.toBe(sha256("ingreso:1.2.3.4"));
  });

  it("en producción sin secreto lanza en vez de devolver sha256", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => claveDeLimite("ingreso:1.2.3.4")).toThrow(/RATE_LIMIT_SECRET/);
  });

  it("dos secretos distintos dan claves distintas", () => {
    vi.stubEnv("RATE_LIMIT_SECRET", "uno");
    const con1 = claveDeLimite("x");
    vi.stubEnv("RATE_LIMIT_SECRET", "dos");
    expect(claveDeLimite("x")).not.toBe(con1);
  });

  it("limitarPersistente manda la clave con HMAC cuando hay secreto", async () => {
    vi.stubEnv("RATE_LIMIT_SECRET", "secreto-de-prueba");
    consumir.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    await limitarPersistente("registro:a@b.com", regla);
    expect(consumir).toHaveBeenCalledWith(hmac("registro:a@b.com", "secreto-de-prueba"), 5, 60);
  });
});
