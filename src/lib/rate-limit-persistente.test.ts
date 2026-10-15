import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { limitarPersistente, limitarPorIp, mensajeDeLimite } from "./rate-limit-persistente";

const regla = { maximo: 5, ventanaMs: 60_000 };
const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

beforeEach(() => {
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
