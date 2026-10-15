import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { IP_DESCONOCIDA, ipDeEncabezados } from "./ip-del-pedido";

const con = (valores: Record<string, string>) => new Headers(valores);

describe("ipDeEncabezados", () => {
  it("usa la IP que pone Vercel", () => {
    expect(ipDeEncabezados(con({ "x-vercel-forwarded-for": "190.1.2.3" }))).toBe("190.1.2.3");
  });

  it("no confía en el primer valor de x-forwarded-for, que lo arma el cliente", () => {
    const encabezados = con({ "x-forwarded-for": "6.6.6.6, 10.0.0.1" });
    expect(ipDeEncabezados(encabezados)).toBe(IP_DESCONOCIDA);
  });

  it("si no hay cabecera de Vercel usa x-real-ip", () => {
    const encabezados = con({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "190.9.9.9" });
    expect(ipDeEncabezados(encabezados)).toBe("190.9.9.9");
  });

  it("sin cabeceras devuelve desconocida", () => {
    expect(ipDeEncabezados(con({}))).toBe(IP_DESCONOCIDA);
  });
});
