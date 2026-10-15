import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPorIp } from "@/lib/rate-limit-persistente";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));

describe("GET /api/salud: tope por IP (B-13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
