import { beforeEach, describe, expect, it, vi } from "vitest";

import { limitarPorIp, limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { ingresar } from "./acciones";

const { redirigir } = vi.hoisted(() => ({ redirigir: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: redirigir }));
vi.mock("@/lib/sesion", () => ({ rolDeLaSesion: vi.fn(async () => "cliente") }));
vi.mock("@/lib/ip-del-pedido", () => ({
  IP_DESCONOCIDA: "desconocida",
  ipDelPedido: vi.fn(async () => "190.1.2.3"),
}));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
// Limitador: por defecto entra. Los fallos usan la misma función persistente.
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  mensajeDeLimite: (r: { permitido: boolean; segundosParaReintentar: number }) =>
    r.permitido
      ? null
      : `Hiciste demasiados intentos. Esperá ${r.segundosParaReintentar} segundos y probá de nuevo.`,
}));

const EMAIL = "ana@ejemplo.com";
const CLAVE = "clave-de-prueba-1";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

const datosIngreso = (email = EMAIL) => formulario({ email, contrasena: CLAVE });

describe("ingresar: tope de fallos por cuenta (LAB-54, B-11)", () => {
  let signIn: ReturnType<typeof vi.fn>;
  const fallo = { data: { user: null }, error: { code: "invalid_credentials", status: 400 } };
  const acierto = { data: { user: { id: "u-1" } }, error: null };

  beforeEach(() => {
    vi.clearAllMocks();
    signIn = vi.fn(async () => acierto);
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { signInWithPassword: signIn },
    } as never);
  });

  it("un ingreso correcto no consume cupo por cuenta", async () => {
    await ingresar({}, datosIngreso());
    expect(signIn).toHaveBeenCalledWith({ email: EMAIL, password: CLAVE });
    expect(limitarPersistente).not.toHaveBeenCalled();
  });

  it("un fallo cuenta por email+IP (10 cada 15 min) y por email global (50 por hora)", async () => {
    signIn.mockResolvedValueOnce(fallo);
    await ingresar({}, datosIngreso(" Ana@Ejemplo.com "));
    expect(limitarPersistente).toHaveBeenCalledWith("ingreso-fallo:ana@ejemplo.com:190.1.2.3", {
      maximo: 10,
      ventanaMs: 15 * 60_000,
    });
    expect(limitarPersistente).toHaveBeenCalledWith("ingreso-fallo-cuenta:ana@ejemplo.com", {
      maximo: 50,
      ventanaMs: 60 * 60_000,
    });
  });

  it("si el fallo supera el tope responde con el mensaje de límite en vez del error de credenciales", async () => {
    signIn.mockResolvedValueOnce(fallo);
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 300,
    });

    const estado = await ingresar({}, datosIngreso());

    expect(estado.mensaje).toBe(
      "Hiciste demasiados intentos. Esperá 300 segundos y probá de nuevo.",
    );
  });

  it("un fallo bajo el tope muestra el error de credenciales de siempre", async () => {
    signIn.mockResolvedValueOnce(fallo);
    const estado = await ingresar({}, datosIngreso());
    expect(estado.mensaje).toBe("El email o la contraseña no coinciden.");
  });

  it("el tope por IP sigue vigente y corta antes de la contraseña", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 40,
    });

    await ingresar({}, datosIngreso());

    expect(limitarPorIp).toHaveBeenCalledWith("ingreso", { maximo: 5, ventanaMs: 60_000 });
    expect(signIn).not.toHaveBeenCalled();
  });
});
