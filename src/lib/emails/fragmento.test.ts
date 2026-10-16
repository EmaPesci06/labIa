import { describe, expect, it } from "vitest";

import { categoriaSinVerificar, tokenDelFragmento } from "./fragmento";

const UID = "11111111-1111-4111-8111-111111111111";
const cuerpo = (categoria: string) => Buffer.from(`${UID}|${categoria}`).toString("base64url");
const FIRMA = "firma_de_prueba-0123456789ABCDEFGHIJKLMNOPQRST";

describe("tokenDelFragmento", () => {
  it("lee el token del fragmento #t=", () => {
    const token = `${cuerpo("novedades")}.${FIRMA}`;
    expect(tokenDelFragmento(`#t=${encodeURIComponent(token)}`)).toBe(token);
  });

  it("devuelve null sin fragmento, sin t o con una forma inválida", () => {
    expect(tokenDelFragmento("")).toBeNull();
    expect(tokenDelFragmento("#otra=1")).toBeNull();
    expect(tokenDelFragmento("#t=sin-punto")).toBeNull();
    expect(tokenDelFragmento("#t=con%20espacios.y%3Cscript%3E")).toBeNull();
    expect(tokenDelFragmento("#t=a.b.c")).toBeNull();
  });
});

describe("categoriaSinVerificar", () => {
  it.each(["trabajos_cerca", "novedades"] as const)(
    "lee la categoría %s del cuerpo",
    (categoria) => {
      expect(categoriaSinVerificar(`${cuerpo(categoria)}.${FIRMA}`)).toBe(categoria);
    },
  );

  it("devuelve null si la categoría no es conocida o el cuerpo no es base64", () => {
    expect(categoriaSinVerificar(`${cuerpo("otra")}.${FIRMA}`)).toBeNull();
    expect(categoriaSinVerificar(`%%%.${FIRMA}`)).toBeNull();
  });
});
