import { describe, expect, it } from "vitest";

import { chequearBase, respuestaSalud } from "./salud";

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
