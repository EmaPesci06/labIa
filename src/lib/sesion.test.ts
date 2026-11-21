import { afterEach, describe, expect, it, vi } from "vitest";

import { nombreVisible, obtenerSesion, obtenerSesionVerificada, rolDeLaSesion } from "./sesion";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("server-only", () => ({}));
// Por defecto no hay Supabase; los tests de LAB-88 prenden `estado.configurado` y arman un cliente.
const estado = vi.hoisted(() => ({
  configurado: false,
  cliente: null as unknown,
}));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => estado.configurado,
  crearClienteServidor: async () => {
    if (!estado.cliente) throw new Error("no debería pedirse");
    return estado.cliente;
  },
}));
// `cache` de React solo existe en el servidor; en el test devuelve la función tal cual.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T extends (...args: never[]) => unknown>(f: T) => f,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  estado.configurado = false;
  estado.cliente = null;
});

describe("nombreVisible", () => {
  it("une nombre y apellido", () => {
    expect(nombreVisible("Laura", "Fernández", "l@x.com")).toBe("Laura Fernández");
  });
  it("sin nombre usa lo que va antes de la @", () => {
    expect(nombreVisible(null, null, "laura@x.com")).toBe("laura");
  });
  it("sin nada usa un texto neutro", () => {
    expect(nombreVisible(null, null, null)).toBe("Tu cuenta");
  });
});

describe("rolDeLaSesion (LAB-47)", () => {
  /** Cliente de Supabase con la fila de `usuarios` que devuelve `maybeSingle`. */
  function clienteCon(fila: { rol: string } | null) {
    const maybeSingle = vi.fn(async () => ({ data: fila, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    return { cliente: { from } as never, from, eq };
  }

  it("devuelve el rol de la fila del usuario", async () => {
    const { cliente, from, eq } = clienteCon({ rol: "profesional" });
    expect(await rolDeLaSesion(cliente, "u-1")).toBe("profesional");
    expect(from).toHaveBeenCalledWith("usuarios");
    expect(eq).toHaveBeenCalledWith("id", "u-1");
  });

  it("sin fila devuelve cliente", async () => {
    const { cliente } = clienteCon(null);
    expect(await rolDeLaSesion(cliente, "u-1")).toBe("cliente");
  });
});

describe("obtenerSesion", () => {
  it("sin Supabase configurado y sin sesión falsa devuelve null", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    expect(await obtenerSesion()).toBeNull();
  });

  it("en desarrollo, LABIA_ROL_DEV arma una sesión falsa", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    vi.stubEnv("LABIA_ID_DEV", "abc");
    const sesion = await obtenerSesion();
    expect(sesion).toMatchObject({ rol: "profesional", usuario: { id: "abc" } });
  });

  it("en producción ignora LABIA_ROL_DEV", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "profesional");
    expect(await obtenerSesion()).toBeNull();
  });

  it("en producción solo la respeta con LABIA_PERMITIR_ROL_DEV=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ROL_DEV", "cliente");
    vi.stubEnv("LABIA_PERMITIR_ROL_DEV", "1");
    expect(await obtenerSesion()).toMatchObject({ rol: "cliente" });
  });
});

describe("obtenerSesion con Supabase (LAB-88)", () => {
  const FILA = {
    rol: "cliente",
    estado: "activa",
    nombre: "Laura",
    apellido: "Fernández",
    normas_version: null,
    terminos_aceptados_at: "2026-01-01T00:00:00Z",
    barrio_id: 7,
  };

  /** Cliente de Supabase falso que cuenta las llamadas a Auth y a `usuarios`. */
  function armarCliente(opciones: { claims?: Record<string, unknown> | null; fila?: unknown }) {
    const getClaims = vi.fn(async () => ({
      data: opciones.claims ? { claims: opciones.claims } : null,
      error: null,
    }));
    const getUser = vi.fn(async () => ({
      data: { user: opciones.claims ? { id: opciones.claims.sub, email: "l@x.com" } : null },
      error: null,
    }));
    const maybeSingle = vi.fn(async () => ({ data: opciones.fila ?? null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn((_columnas: string) => ({ eq }));
    const from = vi.fn(() => ({ select }));
    estado.configurado = true;
    estado.cliente = { auth: { getClaims, getUser }, from };
    return { getClaims, getUser, from, select, eq };
  }

  it("verifica con getClaims, sin getUser, y lee `usuarios` una sola vez", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const c = armarCliente({ claims: { sub: "u-1", email: "l@x.com" }, fila: FILA });
    const sesion = await obtenerSesion();
    expect(sesion).toMatchObject({
      usuario: { id: "u-1", email: "l@x.com" },
      rol: "cliente",
      barrioId: 7,
      terminosAceptados: true,
    });
    expect(c.getClaims).toHaveBeenCalledTimes(1);
    expect(c.getUser).not.toHaveBeenCalled();
    expect(c.from).toHaveBeenCalledTimes(1);
    expect(c.from).toHaveBeenCalledWith("usuarios");
    expect(c.eq).toHaveBeenCalledWith("id", "u-1");
  });

  it("pide el barrio en la misma consulta de `usuarios`", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const c = armarCliente({ claims: { sub: "u-1" }, fila: FILA });
    await obtenerSesion();
    expect(c.select.mock.calls[0]?.[0]).toContain("barrio_id");
  });

  it("sin claims (sin sesión o token inválido) devuelve null y no lee la base", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const c = armarCliente({ claims: null });
    expect(await obtenerSesion()).toBeNull();
    expect(c.from).not.toHaveBeenCalled();
  });

  it("una cuenta suspendida no entra aunque el token siga vigente", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    armarCliente({ claims: { sub: "u-1" }, fila: { ...FILA, estado: "suspendida" } });
    expect(await obtenerSesion()).toBeNull();
  });

  it("una cuenta dada de baja o sin fila tampoco entra", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    armarCliente({ claims: { sub: "u-1" }, fila: { ...FILA, estado: "baja" } });
    expect(await obtenerSesion()).toBeNull();
    armarCliente({ claims: { sub: "u-1" }, fila: null });
    expect(await obtenerSesion()).toBeNull();
  });
});

describe("obtenerSesionVerificada (Server Actions y /admin)", () => {
  function armarCliente(fila: unknown) {
    const getClaims = vi.fn();
    const getUser = vi.fn(async () => ({
      data: { user: { id: "u-9", email: "a@x.com" } },
      error: null,
    }));
    const maybeSingle = vi.fn(async () => ({ data: fila, error: null }));
    const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
    estado.configurado = true;
    estado.cliente = { auth: { getClaims, getUser }, from };
    return { getClaims, getUser };
  }

  it("valida el token contra Auth con getUser, no con getClaims", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const c = armarCliente({
      rol: "admin",
      estado: "activa",
      nombre: null,
      apellido: null,
      normas_version: null,
      terminos_aceptados_at: null,
      barrio_id: null,
    });
    expect(await obtenerSesionVerificada()).toMatchObject({ rol: "admin", usuario: { id: "u-9" } });
    expect(c.getUser).toHaveBeenCalledTimes(1);
    expect(c.getClaims).not.toHaveBeenCalled();
  });

  it("con la cuenta suspendida devuelve null", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    armarCliente({ rol: "admin", estado: "suspendida" });
    expect(await obtenerSesionVerificada()).toBeNull();
  });
});
