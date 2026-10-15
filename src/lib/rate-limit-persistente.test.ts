import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, configurado, ip } = vi.hoisted(() => ({
  rpc: vi.fn(),
  configurado: { valor: true },
  ip: { valor: "190.1.2.3" },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/ip-del-pedido", () => ({ ipDelPedido: async () => ip.valor }));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => configurado.valor,
  crearClienteServidor: async () => ({ rpc }),
}));

import { reiniciarLimites } from "./rate-limit";
import { limitarPersistente, limitarPorIp, mensajeDeLimite } from "./rate-limit-persistente";

const regla = { maximo: 5, ventanaMs: 60_000 };

beforeEach(() => {
  rpc.mockReset();
  reiniciarLimites();
  configurado.valor = true;
  ip.valor = "190.1.2.3";
});

describe("limitarPersistente", () => {
  it("cuenta en la base con la clave, el máximo y la ventana en segundos", async () => {
    rpc.mockResolvedValue({
      data: [{ permitido: true, segundos_para_reintentar: 0 }],
      error: null,
    });

    const resultado = await limitarPersistente("ingreso:1.2.3.4", regla);

    expect(rpc).toHaveBeenCalledWith("consumir_cupo", {
      p_clave: "ingreso:1.2.3.4",
      p_maximo: 5,
      p_ventana_segundos: 60,
    });
    expect(resultado).toEqual({ permitido: true, segundosParaReintentar: 0 });
  });

  it("devuelve el bloqueo con los segundos que faltan", async () => {
    rpc.mockResolvedValue({
      data: [{ permitido: false, segundos_para_reintentar: 42 }],
      error: null,
    });

    const resultado = await limitarPersistente("ingreso:x", regla);

    expect(resultado).toEqual({ permitido: false, segundosParaReintentar: 42 });
  });

  it("si la base falla cae al limitador en memoria y sigue limitando", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "caída" } });
    const chica = { maximo: 1, ventanaMs: 60_000 };

    expect((await limitarPersistente("respaldo", chica)).permitido).toBe(true);
    expect((await limitarPersistente("respaldo", chica)).permitido).toBe(false);
  });

  it("sin Supabase configurado usa solo la memoria", async () => {
    configurado.valor = false;
    const chica = { maximo: 1, ventanaMs: 60_000 };

    expect((await limitarPersistente("sin-config", chica)).permitido).toBe(true);
    expect((await limitarPersistente("sin-config", chica)).permitido).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("limitarPorIp", () => {
  it("arma la clave con la acción y la IP del pedido", async () => {
    rpc.mockResolvedValue({
      data: [{ permitido: true, segundos_para_reintentar: 0 }],
      error: null,
    });

    await limitarPorIp("reenvio-ip", regla);

    expect(rpc).toHaveBeenCalledWith(
      "consumir_cupo",
      expect.objectContaining({ p_clave: "reenvio-ip:190.1.2.3" }),
    );
  });
});

describe("mensajeDeLimite", () => {
  it("no muestra nada si el intento entra", () => {
    expect(mensajeDeLimite({ permitido: true, segundosParaReintentar: 0 })).toBeNull();
  });

  it("explica cuántos segundos esperar", () => {
    expect(mensajeDeLimite({ permitido: false, segundosParaReintentar: 30 })).toBe(
      "Hiciste demasiados intentos. Esperá 30 segundos y probá de nuevo.",
    );
  });
});
