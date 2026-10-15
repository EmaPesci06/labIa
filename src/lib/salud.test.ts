import { describe, expect, it } from "vitest";

import {
  chequearBase,
  guardarSaludCacheada,
  leerSaludCacheada,
  reiniciarCacheSalud,
  respuestaSalud,
  TTL_SALUD_MS,
} from "./salud";

describe("chequearBase", () => {
  it("es ok cuando la consulta responde sin error", async () => {
    await expect(chequearBase(async () => ({ error: null }))).resolves.toBe("ok");
  });

  it("es error cuando la consulta devuelve error", async () => {
    await expect(chequearBase(async () => ({ error: { message: "x" } }))).resolves.toBe("error");
  });

  it("es error cuando la consulta lanza", async () => {
    await expect(
      chequearBase(async () => {
        throw new Error("sin red");
      }),
    ).resolves.toBe("error");
  });

  it("es error si la base no responde a tiempo", async () => {
    const colgada = () => new Promise<{ error: unknown }>(() => undefined);
    await expect(chequearBase(colgada, 10)).resolves.toBe("error");
  });
});

describe("respuestaSalud", () => {
  it("solo expone el estado, sin detalles de la base", () => {
    expect(respuestaSalud("ok")).toEqual({ estado: "ok", base: "ok" });
    expect(respuestaSalud("error")).toEqual({ estado: "error", base: "error" });
  });
});

describe("caché corta de salud (LAB-54)", () => {
  it("devuelve la respuesta guardada hasta que vence el TTL", () => {
    reiniciarCacheSalud();
    guardarSaludCacheada({ estado: "ok", base: "ok" }, 200, 1_000);
    expect(leerSaludCacheada(1_000 + TTL_SALUD_MS - 1)?.status).toBe(200);
    expect(leerSaludCacheada(1_000 + TTL_SALUD_MS)).toBeNull();
  });

  it("sin nada guardado no devuelve nada", () => {
    reiniciarCacheSalud();
    expect(leerSaludCacheada(0)).toBeNull();
  });

  it("el TTL está entre 10 y 30 segundos", () => {
    expect(TTL_SALUD_MS).toBeGreaterThanOrEqual(10_000);
    expect(TTL_SALUD_MS).toBeLessThanOrEqual(30_000);
  });
});
