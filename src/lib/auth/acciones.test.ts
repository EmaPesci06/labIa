import { beforeEach, describe, expect, it, vi } from "vitest";

import { limiteIngresoPorCuenta } from "@/lib/limites";
import { limitarPorIp, limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { ingresar } from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/sesion", () => ({ rolDeLaSesion: vi.fn(async () => "cliente") }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
// Limitador: por defecto entra. El tope por cuenta (B-11) usa la misma función persistente.
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  mensajeDeLimite: (r: { permitido: boolean; segundosParaReintentar: number }) =>
    r.permitido
      ? null
      : `Hiciste demasiados intentos. Esperá ${r.segundosParaReintentar} segundos y probá de nuevo.`,
}));

const EMAIL = "ana@ejemplo.com";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

const datosIngreso = () => formulario({ email: EMAIL, contrasena: "clave-de-prueba-1" });

describe("ingresar: tope por cuenta además del de IP (LAB-54, B-11)", () => {
  let signIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    signIn = vi.fn(async () => ({ data: { user: { id: "u-1" } }, error: null }));
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { signInWithPassword: signIn },
    } as never);
  });

  it("cuenta por cuenta con el email normalizado, 10 cada 15 minutos", async () => {
    await ingresar({}, formulario({ email: " Ana@Ejemplo.com ", contrasena: "clave-de-prueba-1" }));
    expect(limitarPersistente).toHaveBeenCalledWith("ingreso-cuenta:ana@ejemplo.com", {
      maximo: 10,
      ventanaMs: 15 * 60_000,
    });
  });

  it("si la cuenta superó el tope no intenta el ingreso y responde en castellano", async () => {
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 300,
    });

    const estado = await ingresar({}, datosIngreso());

    expect(estado.mensaje).toBe(
      "Hiciste demasiados intentos. Esperá 300 segundos y probá de nuevo.",
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("si la cuenta entra, el ingreso sigue su curso", async () => {
    await ingresar({}, datosIngreso());
    expect(signIn).toHaveBeenCalledWith({ email: EMAIL, password: "clave-de-prueba-1" });
  });

  it("el tope por IP sigue vigente y corta antes que el de cuenta", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 40,
    });

    await ingresar({}, datosIngreso());

    expect(limitarPorIp).toHaveBeenCalledWith("ingreso", { maximo: 5, ventanaMs: 60_000 });
    expect(limitarPersistente).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("la regla por cuenta es la que expone limiteIngresoPorCuenta", async () => {
    await limiteIngresoPorCuenta(EMAIL);
    expect(limitarPersistente).toHaveBeenCalledWith(`ingreso-cuenta:${EMAIL}`, {
      maximo: 10,
      ventanaMs: 15 * 60_000,
    });
  });
});
