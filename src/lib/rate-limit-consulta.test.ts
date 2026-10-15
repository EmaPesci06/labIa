import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consultar, configurado, sentry } = vi.hoisted(() => ({
  consultar: vi.fn(),
  configurado: { valor: true },
  sentry: { captureException: vi.fn() },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/lib/ip-del-pedido", () => ({ ipDelPedido: async () => "190.1.2.3" }));
vi.mock("@/lib/rate-limit-servicio", () => ({ consultarCupoServicio: consultar }));
vi.mock("@/lib/supabase/servidor", () => ({ supabaseConfigurado: () => configurado.valor }));

import { reiniciarLimites } from "./rate-limit";
import { cupoDisponible } from "./rate-limit-consulta";

const regla = { maximo: 2, ventanaMs: 60_000 };
const hmac = (t: string, secreto: string) => createHmac("sha256", secreto).update(t).digest("hex");

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_SECRET", "secreto-de-prueba");
  consultar.mockReset();
  sentry.captureException.mockReset();
  reiniciarLimites();
  configurado.valor = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cupoDisponible (lectura sin consumo)", () => {
  it("consulta la base con la clave HMAC, sin que el cliente vea la clave en claro", async () => {
    consultar.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });

    await cupoDisponible("ingreso-fallo-cuenta:ana@ejemplo.com", regla);

    expect(consultar).toHaveBeenCalledWith(
      hmac("ingreso-fallo-cuenta:ana@ejemplo.com", "secreto-de-prueba"),
      2,
      60,
    );
    expect(consultar.mock.calls[0]?.[0]).not.toContain("ana@ejemplo.com");
  });

  it("devuelve el bloqueo con los segundos que faltan, tal como lo dice la base", async () => {
    consultar.mockResolvedValue({ permitido: false, segundosParaReintentar: 42 });
    expect(await cupoDisponible("ingreso-fallo:x", regla)).toEqual({
      permitido: false,
      segundosParaReintentar: 42,
    });
  });

  it("nunca consume: la base recibe solo la consulta, y consultar varias veces no bloquea", async () => {
    consultar.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    for (let i = 0; i < 5; i++) await cupoDisponible("ingreso-fallo:y", regla);
    expect(consultar).toHaveBeenCalledTimes(5);
    // Ninguna consulta cuenta un intento: sin consumo la memoria también queda intacta.
    expect((await cupoDisponible("ingreso-fallo:y", regla)).permitido).toBe(true);
  });

  it("sin Supabase lee la memoria y no consulta la base", async () => {
    configurado.valor = false;
    expect(await cupoDisponible("ingreso-fallo:z", regla)).toEqual({
      permitido: true,
      segundosParaReintentar: 0,
    });
    expect(consultar).not.toHaveBeenCalled();
  });

  it("si la base falla usa la memoria y reporta a Sentry sin la clave (no falla abierto en silencio)", async () => {
    consultar.mockRejectedValue(new Error("caída"));
    expect((await cupoDisponible("ingreso-fallo:w", regla)).permitido).toBe(true);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const evento = sentry.captureException.mock.calls[0]?.[1] as { tags: { evento: string } };
    expect(evento.tags.evento).toBe("consultar-cupo-respaldo-memoria");
    expect(JSON.stringify(sentry.captureException.mock.calls)).not.toContain("ingreso-fallo:w");
  });
});
