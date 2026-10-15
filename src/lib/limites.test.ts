import { beforeEach, describe, expect, it, vi } from "vitest";

const { porIp, persistente, ip } = vi.hoisted(() => ({
  porIp: vi.fn(),
  persistente: vi.fn(),
  ip: { valor: "190.1.2.3" },
}));

vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: porIp,
  limitarPersistente: persistente,
  mensajeDeLimite: (resultado: { permitido: boolean; segundosParaReintentar: number }) =>
    resultado.permitido
      ? null
      : `Hiciste demasiados intentos. Esperá ${resultado.segundosParaReintentar} segundos y probá de nuevo.`,
}));
vi.mock("@/lib/ip-del-pedido", () => ({
  IP_DESCONOCIDA: "desconocida",
  ipDelPedido: async () => ip.valor,
}));

import {
  bloqueoLecturaPublica,
  limiteContactoPorIp,
  limiteReportePorIp,
  limiteSaludPorIp,
  REGLAS_LIMITE,
  registrarFalloDeIngreso,
} from "./limites";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ENTRA = { permitido: true, segundosParaReintentar: 0 };
const BLOQUEA = { permitido: false, segundosParaReintentar: 27 };

beforeEach(() => {
  porIp.mockReset().mockResolvedValue(ENTRA);
  persistente.mockReset().mockResolvedValue(ENTRA);
  ip.valor = "190.1.2.3";
});

describe("lecturas públicas por IP (M-03)", () => {
  it("búsqueda: clave por IP con la acción propia, 120 por minuto", async () => {
    await bloqueoLecturaPublica("busqueda");
    expect(porIp).toHaveBeenCalledWith("lectura-publica-busqueda", {
      maximo: 120,
      ventanaMs: MINUTO,
    });
  });

  it("perfil: clave por IP con la acción propia, 120 por minuto", async () => {
    await bloqueoLecturaPublica("perfil");
    expect(porIp).toHaveBeenCalledWith("lectura-publica-perfil", {
      maximo: 120,
      ventanaMs: MINUTO,
    });
  });

  it("devuelve null si la IP entra y el mensaje en castellano si bloquea", async () => {
    expect(await bloqueoLecturaPublica("busqueda")).toBeNull();
    porIp.mockResolvedValueOnce(BLOQUEA);
    expect(await bloqueoLecturaPublica("perfil")).toBe(
      "Hiciste demasiados intentos. Esperá 27 segundos y probá de nuevo.",
    );
  });

  it("con la IP desconocida no aplica el tope por IP", async () => {
    ip.valor = "desconocida";
    expect(await bloqueoLecturaPublica("busqueda")).toBeNull();
    expect(porIp).not.toHaveBeenCalled();
  });
});

describe("contacto y reportes por IP", () => {
  it("contacto: clave 'contacto' por IP, 30 por hora", async () => {
    await limiteContactoPorIp();
    expect(porIp).toHaveBeenCalledWith("contacto", { maximo: 30, ventanaMs: HORA });
  });

  it("contacto: bloquea cuando la IP supera el tope", async () => {
    porIp.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteContactoPorIp()).permitido).toBe(false);
  });

  it("contacto con IP desconocida no aplica el tope por IP", async () => {
    ip.valor = "desconocida";
    expect((await limiteContactoPorIp()).permitido).toBe(true);
    expect(porIp).not.toHaveBeenCalled();
  });

  it("reportes: clave 'reporte' por IP, 30 por día", async () => {
    await limiteReportePorIp();
    expect(porIp).toHaveBeenCalledWith("reporte", { maximo: 30, ventanaMs: DIA });
  });

  it("reportes: bloquea cuando la IP supera el tope", async () => {
    porIp.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteReportePorIp()).permitido).toBe(false);
  });

  it("reportes con IP desconocida no aplican el tope por IP", async () => {
    ip.valor = "desconocida";
    expect((await limiteReportePorIp()).permitido).toBe(true);
    expect(porIp).not.toHaveBeenCalled();
  });
});

describe("fallos de ingreso (B-11)", () => {
  it("registra el fallo por email+IP con 10 cada 15 minutos", async () => {
    await registrarFalloDeIngreso("  Ana@Ejemplo.COM ");
    expect(persistente).toHaveBeenCalledWith("ingreso-fallo:ana@ejemplo.com:190.1.2.3", {
      maximo: 10,
      ventanaMs: 15 * MINUTO,
    });
  });

  it("registra también el fallo por email global con 50 por hora", async () => {
    await registrarFalloDeIngreso("ana@ejemplo.com");
    expect(persistente).toHaveBeenCalledWith("ingreso-fallo-cuenta:ana@ejemplo.com", {
      maximo: 50,
      ventanaMs: HORA,
    });
  });

  it("bloquea si se pasa el tope de email+IP", async () => {
    persistente.mockResolvedValueOnce(BLOQUEA);
    expect((await registrarFalloDeIngreso("ana@ejemplo.com")).permitido).toBe(false);
  });

  it("bloquea si se pasa el tope global del email aunque la IP sea otra", async () => {
    persistente.mockResolvedValueOnce(ENTRA).mockResolvedValueOnce(BLOQUEA);
    expect((await registrarFalloDeIngreso("ana@ejemplo.com")).permitido).toBe(false);
  });

  it("las reglas de fallos de ingreso quedan como constantes nombradas", () => {
    expect(REGLAS_LIMITE.ingresoFallosPorCuentaIp).toEqual({ maximo: 10, ventanaMs: 15 * MINUTO });
    expect(REGLAS_LIMITE.ingresoFallosPorCuenta).toEqual({ maximo: 50, ventanaMs: HORA });
  });
});

describe("salud por IP (B-13)", () => {
  it("clave 'salud' por IP, 60 por minuto, también con IP desconocida", async () => {
    ip.valor = "desconocida";
    await limiteSaludPorIp();
    expect(porIp).toHaveBeenCalledWith("salud", { maximo: 60, ventanaMs: MINUTO });
  });

  it("las reglas quedan como constantes nombradas", () => {
    expect(REGLAS_LIMITE.salud).toEqual({ maximo: 60, ventanaMs: MINUTO });
  });
});
