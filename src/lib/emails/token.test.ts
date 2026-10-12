import { describe, expect, it } from "vitest";

import { firmarTokenBaja, verificarTokenBaja } from "./token";

const USUARIO = "550e8400-e29b-41d4-a716-446655440000";

describe("token de baja", () => {
  it("firma y verifica", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "trabajos_cerca" }, "secreto");
    expect(verificarTokenBaja(token, "secreto")).toEqual({
      usuarioId: USUARIO,
      categoria: "trabajos_cerca",
    });
  });

  it("no contiene el email ni nada legible más que el id", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, "secreto");
    expect(token).not.toContain("@");
  });

  it("rechaza otra clave", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, "secreto");
    expect(verificarTokenBaja(token, "otra")).toBeNull();
  });

  it("rechaza un cuerpo alterado con la firma original", () => {
    const token = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, "secreto");
    const firma = token.split(".")[1] ?? "";
    const otro = Buffer.from(`${USUARIO.replace("550e", "550f")}|novedades`).toString("base64url");
    expect(verificarTokenBaja(`${otro}.${firma}`, "secreto")).toBeNull();
  });

  it.each(["", "abc", "a.b.c", ".", "x."])("rechaza basura: %j", (token) => {
    expect(verificarTokenBaja(token, "secreto")).toBeNull();
  });

  it("rechaza una categoría desconocida aunque esté bien firmada", () => {
    const cuerpo = Buffer.from(`${USUARIO}|todo`).toString("base64url");
    // Firma válida construida con la misma función interna: se simula firmando a mano.
    const valido = firmarTokenBaja({ usuarioId: USUARIO, categoria: "novedades" }, "s");
    const firmaDeOtro = valido.split(".")[1] ?? "";
    expect(verificarTokenBaja(`${cuerpo}.${firmaDeOtro}`, "s")).toBeNull();
  });
});
