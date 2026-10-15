import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPorIp } from "@/lib/rate-limit-persistente";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { cargarMasResenas } from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(async () => ({})),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));
vi.mock("./cargar", () => ({
  obtenerResenas: vi.fn(async () => ({ resenas: [], hayMas: false })),
}));

const PROFESIONAL = "11111111-1111-4111-8111-111111111111";

describe("cargarMasResenas: límite persistente por IP (LAB-47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuenta el pedido por IP con la acción 'resenas', 30 por minuto", async () => {
    await cargarMasResenas(PROFESIONAL, 0);

    expect(limitarPorIp).toHaveBeenCalledWith("resenas", { maximo: 30, ventanaMs: 60_000 });
  });

  it("si el límite bloquea, no consulta la base y lo dice en castellano", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({ permitido: false, segundosParaReintentar: 7 });

    const r = await cargarMasResenas(PROFESIONAL, 0);

    expect(r).toEqual({
      ok: false,
      mensaje: "Hiciste demasiados pedidos. Esperá 7 segundos y probá de nuevo.",
    });
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });
});
