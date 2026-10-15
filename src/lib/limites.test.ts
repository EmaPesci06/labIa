import { beforeEach, describe, expect, it, vi } from "vitest";

const { porIp, persistente } = vi.hoisted(() => ({
  porIp: vi.fn(),
  persistente: vi.fn(),
}));

vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: porIp,
  limitarPersistente: persistente,
  mensajeDeLimite: (resultado: { permitido: boolean; segundosParaReintentar: number }) =>
    resultado.permitido
      ? null
      : `Hiciste demasiados intentos. Esperá ${resultado.segundosParaReintentar} segundos y probá de nuevo.`,
}));

import {
  bloqueoLecturaPublica,
  limiteContactoPorIp,
  limiteContactosDelProfesional,
  limiteIngresoPorCuenta,
  limiteReportePorIp,
  limiteSaludPorIp,
  REGLAS_LIMITE,
} from "./limites";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ENTRA = { permitido: true, segundosParaReintentar: 0 };
const BLOQUEA = { permitido: false, segundosParaReintentar: 27 };

beforeEach(() => {
  porIp.mockReset().mockResolvedValue(ENTRA);
  persistente.mockReset().mockResolvedValue(ENTRA);
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
});

describe("contacto por IP y tope diario por profesional (M-03)", () => {
  it("contacto por IP: clave 'contacto' por IP, 30 por hora", async () => {
    await limiteContactoPorIp();
    expect(porIp).toHaveBeenCalledWith("contacto", { maximo: 30, ventanaMs: HORA });
  });

  it("contacto por IP: bloquea cuando la IP supera el tope", async () => {
    porIp.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteContactoPorIp()).permitido).toBe(false);
  });

  it("tope diario por profesional: clave con su id, 50 por día, sumando a todos los clientes", async () => {
    await limiteContactosDelProfesional("prof-1");
    expect(persistente).toHaveBeenCalledWith("contacto-profesional:prof-1", {
      maximo: 50,
      ventanaMs: DIA,
    });
  });

  it("tope diario por profesional: bloquea al profesional cuando llega al tope", async () => {
    persistente.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteContactosDelProfesional("prof-1")).permitido).toBe(false);
  });

  it("la clave del profesional es distinta para cada profesional", async () => {
    await limiteContactosDelProfesional("prof-1");
    await limiteContactosDelProfesional("prof-2");
    const claves = persistente.mock.calls.map((llamada) => llamada[0]);
    expect(claves).toEqual(["contacto-profesional:prof-1", "contacto-profesional:prof-2"]);
  });
});

describe("reportes por IP (M-05)", () => {
  it("clave 'reporte' por IP, 30 por día", async () => {
    await limiteReportePorIp();
    expect(porIp).toHaveBeenCalledWith("reporte", { maximo: 30, ventanaMs: DIA });
  });

  it("bloquea cuando la IP supera el tope", async () => {
    porIp.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteReportePorIp()).permitido).toBe(false);
  });
});

describe("ingreso por cuenta (B-11)", () => {
  it("clave por email normalizado, 10 cada 15 minutos", async () => {
    await limiteIngresoPorCuenta("  Ana@Ejemplo.COM ");
    expect(persistente).toHaveBeenCalledWith("ingreso-cuenta:ana@ejemplo.com", {
      maximo: 10,
      ventanaMs: 15 * MINUTO,
    });
  });

  it("la misma cuenta con distinta capitalización comparte el mismo cupo", async () => {
    await limiteIngresoPorCuenta("ana@ejemplo.com");
    await limiteIngresoPorCuenta("ANA@ejemplo.com");
    const claves = persistente.mock.calls.map((llamada) => llamada[0]);
    expect(claves[0]).toBe(claves[1]);
  });

  it("bloquea cuando la cuenta supera el tope", async () => {
    persistente.mockResolvedValueOnce(BLOQUEA);
    expect((await limiteIngresoPorCuenta("ana@ejemplo.com")).permitido).toBe(false);
  });
});

describe("salud por IP (B-13)", () => {
  it("clave 'salud' por IP, 60 por minuto", async () => {
    await limiteSaludPorIp();
    expect(porIp).toHaveBeenCalledWith("salud", { maximo: 60, ventanaMs: MINUTO });
  });

  it("las reglas quedan como constantes nombradas", () => {
    expect(REGLAS_LIMITE.salud).toEqual({ maximo: 60, ventanaMs: MINUTO });
    expect(REGLAS_LIMITE.ingresoPorCuenta.maximo).toBe(10);
  });
});
