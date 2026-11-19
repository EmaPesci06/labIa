import { beforeEach, describe, expect, it, vi } from "vitest";

import { rolDeLaSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { registrarCliente } from "./registro-cliente";

const { redirigir } = vi.hoisted(() => ({
  redirigir: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: redirigir }));
vi.mock("@/lib/metricas-servidor", () => ({ registrarEventoServidor: vi.fn() }));
vi.mock("@/lib/sesion", () => ({ rolDeLaSesion: vi.fn(async () => "cliente") }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  mensajeDeLimite: () => null,
}));

const EMAIL = "carla@ejemplo.com";

function datosValidos(): FormData {
  const datos = new FormData();
  datos.set("nombreCompleto", "Carla Gómez");
  datos.set("whatsapp", "2235550123");
  datos.set("email", EMAIL);
  datos.set("contrasena", "unaclave123");
  datos.set("barrio", "17");
  return datos;
}

describe("registrarCliente (LAB-76)", () => {
  let getUser: ReturnType<typeof vi.fn>;
  let signUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getUser = vi.fn(async () => ({ data: { user: null } }));
    signUp = vi.fn(async () => ({
      data: { user: { id: "u-1", identities: [{ id: "id-1" }] }, session: null },
      error: null,
    }));
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(rolDeLaSesion).mockResolvedValue("cliente");
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { getUser, signUp },
    } as never);
  });

  it("alta nueva con confirmación de email devuelve confirmarEmail", async () => {
    const estado = await registrarCliente({}, datosValidos());
    expect(estado).toEqual({ confirmarEmail: EMAIL, valores: { email: EMAIL } });
  });

  it("email existente devuelve exactamente la misma respuesta que un alta nueva (sin enumerar)", async () => {
    const esperado = { confirmarEmail: EMAIL, valores: { email: EMAIL } };

    signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422 },
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);

    signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "email_exists", status: 400 },
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);

    signUp.mockResolvedValueOnce({
      data: { user: { id: "u-dup", identities: [] }, session: null },
      error: null,
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);
  });

  it("si ya hay sesión activa, redirige al inicio del rol y no llama a signUp", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-activo" } } });
    vi.mocked(rolDeLaSesion).mockResolvedValueOnce("profesional");

    await expect(registrarCliente({}, datosValidos())).rejects.toThrow("NEXT_REDIRECT:/trabajos");
    expect(signUp).not.toHaveBeenCalled();
  });
});
