import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { claveDeIp, IP_DESCONOCIDA, ipDeEncabezados } from "./ip-del-pedido";

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

  it("una IPv6 llega como prefijo /64 expandido", () => {
    expect(ipDeEncabezados(con({ "x-vercel-forwarded-for": "2001:db8:abcd:12::5" }))).toBe(
      "2001:0db8:abcd:0012::/64",
    );
  });
});

describe("claveDeIp (IPv6 por /64)", () => {
  it("deja las IPv4 sin cambios", () => {
    expect(claveDeIp("190.1.2.3")).toBe("190.1.2.3");
  });

  it("IPv6 comprimida y completa del mismo /64 dan la misma clave", () => {
    const comprimida = claveDeIp("2001:db8:1:2::1");
    const completa = claveDeIp("2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd");
    expect(comprimida).toBe("2001:0db8:0001:0002::/64");
    expect(completa).toBe(comprimida);
  });

  it("direcciones distintas dentro del mismo /64 comparten balde", () => {
    expect(claveDeIp("2001:db8:1:2::10")).toBe(claveDeIp("2001:db8:1:2:ffff::20"));
  });

  it("prefijos distintos dan claves distintas", () => {
    expect(claveDeIp("2001:db8:1:2::1")).not.toBe(claveDeIp("2001:db8:1:3::1"));
  });

  it("IPv6 con '::' al principio y al final", () => {
    expect(claveDeIp("::1")).toBe("0000:0000:0000:0000::/64");
    expect(claveDeIp("fe80::")).toBe("fe80:0000:0000:0000::/64");
  });

  it("IPv4 mapeada (::ffff:a.b.c.d) da la IPv4 misma, en comprimida, expandida y hex", () => {
    expect(claveDeIp("::ffff:190.1.2.3")).toBe("190.1.2.3");
    expect(claveDeIp("0:0:0:0:0:ffff:190.1.2.3")).toBe("190.1.2.3");
    expect(claveDeIp("::ffff:c0a8:0101")).toBe("192.168.1.1");
  });

  it("IPv6 con cola IPv4 que no es mapeada usa los grupos expandidos", () => {
    expect(claveDeIp("2001:db8:1:2:0:0:190.1.2.3")).toBe("2001:0db8:0001:0002::/64");
  });

  it("una IPv6 mal formada conserva el texto original", () => {
    expect(claveDeIp("2001:db8:::1")).toBe("2001:db8:::1");
    expect(claveDeIp("1:2:3:4:5:6:7:8:9")).toBe("1:2:3:4:5:6:7:8:9");
  });
});
