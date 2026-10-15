import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { GET } from "./route";

const USUARIO = "88888888-8888-4888-8888-888888888888";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));

/** Cliente de Supabase con un usuario logueado (el resto de las consultas no se llega a hacer). */
function clienteConUsuario() {
  vi.mocked(crearClienteServidor).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: USUARIO, email: null } } }) },
  } as never);
}

describe("GET /api/cuenta/datos: límite persistente (LAB-47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuenta la exportación por usuario, 5 por minuto", async () => {
    clienteConUsuario();
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 12,
    });

    await GET();

    expect(limitarPersistente).toHaveBeenCalledWith(`cuenta-exportar:${USUARIO}`, {
      maximo: 5,
      ventanaMs: 60_000,
    });
  });

  it("si el límite bloquea responde 429 con el tiempo de espera", async () => {
    clienteConUsuario();
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 12,
    });

    const respuesta = await GET();

    expect(respuesta.status).toBe(429);
    expect(await respuesta.json()).toEqual({
      error: "Esperá 12 segundos y probá de nuevo.",
    });
  });
});
