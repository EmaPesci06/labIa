import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { IP_DESCONOCIDA, ipDeEncabezados } from "./ip-del-pedido";

const con = (valores: Record<string, string>) => new Headers(valores);

describe("ipDeEncabezados", () => {
  it("usa la IP que pone Vercel", () => {
    expect(ipDeEncabezados(con({ "x-vercel-forwarded-for": "190.1.2.3" }))).toBe("190.1.2.3");
  });

  it("no confía en x-forwarded-for, que lo arma el cliente", () => {
    expect(ipDeEncabezados(con({ "x-forwarded-for": "6.6.6.6, 10.0.0.1" }))).toBe(IP_DESCONOCIDA);
  });

  it("no confía en x-real-ip", () => {
    expect(ipDeEncabezados(con({ "x-real-ip": "190.9.9.9" }))).toBe(IP_DESCONOCIDA);
  });

  it("sin cabecera de Vercel devuelve el balde desconocida", () => {
    expect(ipDeEncabezados(con({}))).toBe(IP_DESCONOCIDA);
  });
});
