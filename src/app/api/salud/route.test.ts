import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPorIp } from "@/lib/rate-limit-persistente";
import { reiniciarCacheSalud, TTL_SALUD_MS } from "@/lib/salud";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));

describe("GET /api/salud: tope por IP y caché corta (B-13, LAB-54)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarCacheSalud();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    // Sin variables de Supabase la respuesta es 503 sin tocar la red: alcanza para probar el tope.
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  it("cuenta el chequeo por IP, 60 por minuto", async () => {
    await GET();
    expect(limitarPorIp).toHaveBeenCalledWith("salud", { maximo: 60, ventanaMs: 60_000 });
  });

  it("si la IP supera el tope responde 429 con Retry-After y sin estado de la base", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({ permitido: false, segundosParaReintentar: 19 });

    const respuesta = await GET();

    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get("retry-after")).toBe("19");
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ error: "Demasiados pedidos." });
  });

  it("si la IP entra responde como antes (503 sin base configurada)", async () => {
    const respuesta = await GET();
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "error", base: "error" });
  });

  it("dentro del TTL devuelve la caché sin pasar por el limitador ni por la base", async () => {
    await GET();
    vi.mocked(limitarPorIp).mockClear();

    const segunda = await GET();

    expect(segunda.status).toBe(503);
    expect(limitarPorIp).not.toHaveBeenCalled();
  });

  it("vencido el TTL vuelve a consultar", async () => {
    await GET();
    vi.mocked(limitarPorIp).mockClear();

    vi.setSystemTime(Date.now() + TTL_SALUD_MS + 1);
    await GET();

    expect(limitarPorIp).toHaveBeenCalledTimes(1);
  });

  it("un 429 no se cachea: la siguiente IP entra con su propio chequeo", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({ permitido: false, segundosParaReintentar: 5 });
    await GET();
    const siguiente = await GET();
    expect(siguiente.status).toBe(503);
    expect(limitarPorIp).toHaveBeenCalledTimes(2);
  });
});
