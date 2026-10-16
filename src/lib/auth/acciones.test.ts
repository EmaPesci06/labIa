import { beforeEach, describe, expect, it, vi } from "vitest";

import { cupoDisponible } from "@/lib/rate-limit-consulta";
import { limitarPorIp, limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { ingresar } from "./acciones";

const { redirigir } = vi.hoisted(() => ({ redirigir: vi.fn() }));

const ENTRA = { permitido: true, segundosParaReintentar: 0 };
const BLOQUEA = { permitido: false, segundosParaReintentar: 300 };

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
// Lectura sin consumo de los topes de fallos (LAB-54): por defecto hay cupo.
vi.mock("@/lib/rate-limit-consulta", () => ({
  cupoDisponible: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));
// Limitador que cuenta: por defecto entra. Solo lo usan los fallos y el tope por IP.
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
    vi.mocked(cupoDisponible).mockResolvedValue(ENTRA);
    signIn = vi.fn(async () => acierto);
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { signInWithPassword: signIn },
    } as never);
  });

  it("cupo agotado y contraseña correcta: no entra y no intenta el ingreso", async () => {
    vi.mocked(cupoDisponible).mockResolvedValueOnce(BLOQUEA);

    const estado = await ingresar({}, datosIngreso());

    expect(estado.mensaje).toBe(
      "Hiciste demasiados intentos. Esperá 300 segundos y probá de nuevo.",
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(redirigir).not.toHaveBeenCalled();
  });

  it("cupo libre y contraseña correcta: entra, y el ingreso no consume cupo", async () => {
    await ingresar({}, datosIngreso());

    expect(signIn).toHaveBeenCalledWith({ email: EMAIL, password: CLAVE });
    expect(redirigir).toHaveBeenCalled();
    expect(limitarPersistente).not.toHaveBeenCalled();
  });

  it("consulta sin consumir los dos topes antes de atender la contraseña", async () => {
    await ingresar({}, datosIngreso(" Ana@Ejemplo.com "));
    expect(cupoDisponible).toHaveBeenNthCalledWith(1, "ingreso-fallo:ana@ejemplo.com:190.1.2.3", {
      maximo: 10,
      ventanaMs: 15 * 60_000,
    });
    expect(cupoDisponible).toHaveBeenNthCalledWith(2, "ingreso-fallo-cuenta:ana@ejemplo.com", {
      maximo: 50,
      ventanaMs: 60 * 60_000,
    });
    // La consulta va antes que el intento.
    expect(vi.mocked(cupoDisponible).mock.invocationCallOrder[1]).toBeLessThan(
      signIn.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("un fallo consume los dos topes: email+IP y global", async () => {
    signIn.mockResolvedValueOnce(fallo);
    await ingresar({}, datosIngreso());
    expect(limitarPersistente).toHaveBeenCalledWith("ingreso-fallo:ana@ejemplo.com:190.1.2.3", {
      maximo: 10,
      ventanaMs: 15 * 60_000,
    });
    expect(limitarPersistente).toHaveBeenCalledWith("ingreso-fallo-cuenta:ana@ejemplo.com", {
      maximo: 50,
      ventanaMs: 60 * 60_000,
    });
  });

  it("un fallo que supera el tope responde con el mensaje de límite", async () => {
    signIn.mockResolvedValueOnce(fallo);
    vi.mocked(limitarPersistente).mockResolvedValueOnce(BLOQUEA);
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

  it("el tope por IP sigue vigente y corta antes de consultar la cuenta", async () => {
    vi.mocked(limitarPorIp).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 40,
    });

    await ingresar({}, datosIngreso());

    expect(limitarPorIp).toHaveBeenCalledWith("ingreso", { maximo: 5, ventanaMs: 60_000 });
    expect(cupoDisponible).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });
});
