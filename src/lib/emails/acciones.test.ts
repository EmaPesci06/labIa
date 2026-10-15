import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { guardarPreferenciasEmail } from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./baja", () => ({ aplicarBaja: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));

const USUARIO = "77777777-7777-4777-8777-777777777777";

/** Cliente de Supabase con un usuario logueado y una tabla de preferencias que registra el upsert. */
function clienteConUsuario() {
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ upsert }));
  const cliente = {
    auth: { getUser: async () => ({ data: { user: { id: USUARIO } } }) },
    from,
  };
  vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
  return { upsert };
}

describe("guardarPreferenciasEmail: límite persistente (LAB-47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
  });

  it("cuenta el intento por usuario, 20 por minuto", async () => {
    clienteConUsuario();

    await guardarPreferenciasEmail({}, new FormData());

    expect(limitarPersistente).toHaveBeenCalledWith(`preferencias-email:${USUARIO}`, {
      maximo: 20,
      ventanaMs: 60_000,
    });
  });

  it("si el límite bloquea, no guarda nada y dice cuántos segundos esperar", async () => {
    const { upsert } = clienteConUsuario();
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 15,
    });

    const r = await guardarPreferenciasEmail({}, new FormData());

    expect(r).toEqual({ mensaje: "Esperá 15 segundos y probá de nuevo." });
    expect(upsert).not.toHaveBeenCalled();
  });
});
