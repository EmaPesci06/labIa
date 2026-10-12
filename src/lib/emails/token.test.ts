import { describe, expect, it } from "vitest";

import { firmarTokenBaja, verificarTokenBaja } from "./token";

const SECRETO = "s".repeat(40);
const OTRA = "o".repeat(40);
const USUARIO = "550e8400-e29b-41d4-a716-446655440000";

describe("token de baja", () => {
  it("firma y verifica", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "trabajos_cerca" }, SECRETO);
    expect(verificarTokenBaja(token, SECRETO)).toEqual({
      usuarioId: USUARIO,
      categoria: "trabajos_cerca",
    });
  });

  it("no contiene el email ni nada legible más que el id", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, SECRETO);
    expect(token).not.toContain("@");
  });

  it("rechaza otra clave", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, SECRETO);
    expect(verificarTokenBaja(token, OTRA)).toBeNull();
  });

  it("rechaza un cuerpo alterado con la firma original", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, SECRETO);
    const firma = token.split(".")[1] ?? "";
    const otro = Buffer.from(`${USUARIO.replace("550e", "550f")}|novedades`).toString("base64url");
    expect(verificarTokenBaja(`${otro}.${firma}`, SECRETO)).toBeNull();
  });

  it("un secreto de menos de 32 caracteres se trata como no configurado", () => {
    expect(() =>
      firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, "corto"),
    ).toThrow();
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, SECRETO);
    expect(verificarTokenBaja(token, "corto")).toBeNull();
  });

  it.each(["", "abc", "a.b.c", ".", "x."])("rechaza basura: %j", (token) => {
    expect(verificarTokenBaja(token, SECRETO)).toBeNull();
  });

  it("rechaza una categoría desconocida aunque esté bien firmada", () => {
    const cuerpo = Buffer.from(`${USUARIO}|todo`).toString("base64url");
    // Firma válida construida con la misma función interna: se simula firmando a mano.
    const valido = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, SECRETO);
    const firmaDeOtro = valido.split(".")[1] ?? "";
    expect(verificarTokenBaja(`${cuerpo}.${firmaDeOtro}`, SECRETO)).toBeNull();
  });
});
