import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decidirAcceso } from "@/lib/auth/rutas";

import { refrescarSesion } from "./proxy";

// El cliente de `@supabase/ssr` se reemplaza por uno que cuenta las llamadas a Auth y a la base.
const falso = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: falso.getClaims, getUser: falso.getUser },
    from: falso.from,
  }),
}));

function filaDeUsuarios(fila: unknown) {
  const maybeSingle = vi.fn(async () => ({ data: fila, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  falso.from.mockReturnValue({ select });
  return { eq, select };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const pedido = () => new NextRequest("http://localhost:3000/inicio");

describe("refrescarSesion (LAB-88)", () => {
  it("sin claims no hay sesión y no se lee la base", async () => {
    falso.getClaims.mockResolvedValue({ data: null, error: null });
    const r = await refrescarSesion(pedido());
    expect(r.rol).toBeNull();
    expect(r.estado).toBeNull();
    expect(falso.from).not.toHaveBeenCalled();
  });

  it("verifica con getClaims (nunca getUser) y lee el rol y estado una vez", async () => {
    falso.getClaims.mockResolvedValue({ data: { claims: { sub: "u-1" } }, error: null });
    const { eq } = filaDeUsuarios({ rol: "profesional", estado: "activa" });
    const r = await refrescarSesion(pedido());
    expect(r.rol).toBe("profesional");
    expect(r.estado).toBe("activa");
    expect(falso.getClaims).toHaveBeenCalledTimes(1);
    expect(falso.getUser).not.toHaveBeenCalled();
    expect(falso.from).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("id", "u-1");
  });

  it("una cuenta suspendida conserva el estado y pierde el rol, aunque el token valga", async () => {
    falso.getClaims.mockResolvedValue({ data: { claims: { sub: "u-1" } }, error: null });
    filaDeUsuarios({ rol: "cliente", estado: "suspendida" });
    const r = await refrescarSesion(pedido());
    expect(r.estado).toBe("suspendida");
    expect(r.rol).toBeNull();
  });

  it("sin variables de Supabase no consulta nada", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const r = await refrescarSesion(pedido());
    expect(r.rol).toBeNull();
    expect(falso.getClaims).not.toHaveBeenCalled();
  });

  describe("en /admin valida contra Auth", () => {
    const pedidoAdmin = () => new NextRequest("http://localhost:3000/admin/verificaciones");

    it("usa getUser y no getClaims", async () => {
      falso.getUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
      filaDeUsuarios({ rol: "admin", estado: "activa" });
      const r = await refrescarSesion(pedidoAdmin());
      expect(r.rol).toBe("admin");
      expect(falso.getUser).toHaveBeenCalledTimes(1);
      expect(falso.getClaims).not.toHaveBeenCalled();
    });

    it("con getUser en null (sesión revocada) no hay rol y /admin responde 404", async () => {
      falso.getUser.mockResolvedValue({ data: { user: null }, error: null });
      // Aunque el token todavía pase getClaims, en /admin no se consulta.
      falso.getClaims.mockResolvedValue({ data: { claims: { sub: "u-1" } }, error: null });
      const r = await refrescarSesion(pedidoAdmin());
      expect(r.rol).toBeNull();
      expect(falso.from).not.toHaveBeenCalled();
      expect(decidirAcceso("/admin/verificaciones", "", r.rol, r.estado)).toEqual({
        tipo: "no-encontrada",
      });
    });
  });
});
