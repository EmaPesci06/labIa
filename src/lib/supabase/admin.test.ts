import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ErrorDocumento, firmarDocumento, SEGUNDOS_URL_DOCUMENTO } from "./admin";
import type { Database } from "./tipos";

vi.mock("server-only", () => ({}));

const RUTA = "cccccccc-1200-4000-a000-000000000004/dni_frente-1791734400000.jpg";

function sesionCon(
  rol: "admin" | "cliente" | null,
  estado: "activa" | "suspendida" = "activa",
): SupabaseClient<Database> {
  return {
    auth: {
      getUser: async () => ({ data: { user: rol ? { id: "u1" } : null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: rol ? { rol, estado } : null }) }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

function adminCon(createSignedUrl: ReturnType<typeof vi.fn>): SupabaseClient<Database> {
  return {
    storage: { from: () => ({ createSignedUrl }) },
  } as unknown as SupabaseClient<Database>;
}

describe("firmarDocumento", () => {
  it("firma por 60 segundos cuando la sesión es de un admin", async () => {
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: "https://ejemplo.test/firmada" },
      error: null,
    }));
    const url = await firmarDocumento(RUTA, sesionCon("admin"), adminCon(createSignedUrl));
    expect(url).toBe("https://ejemplo.test/firmada");
    expect(createSignedUrl).toHaveBeenCalledWith(RUTA, 60);
    expect(SEGUNDOS_URL_DOCUMENTO).toBe(60);
  });

  it("no firma si la sesión es de un cliente o no hay sesión", async () => {
    const createSignedUrl = vi.fn();
    await expect(
      firmarDocumento(RUTA, sesionCon("cliente"), adminCon(createSignedUrl)),
    ).rejects.toBeInstanceOf(ErrorDocumento);
    await expect(
      firmarDocumento(RUTA, sesionCon(null), adminCon(createSignedUrl)),
    ).rejects.toBeInstanceOf(ErrorDocumento);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("no firma si el admin está suspendido", async () => {
    const createSignedUrl = vi.fn();
    await expect(
      firmarDocumento(RUTA, sesionCon("admin", "suspendida"), adminCon(createSignedUrl)),
    ).rejects.toBeInstanceOf(ErrorDocumento);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    "../otro/dni_frente-1.jpg",
    "cccccccc-1200-4000-a000-000000000004/selfie-1.jpg",
    "cccccccc-1200-4000-a000-000000000004/dni_frente-1.exe",
    "dni_frente-1.jpg",
    "",
  ])("rechaza la ruta inválida %j sin firmar", async (ruta) => {
    const createSignedUrl = vi.fn();
    await expect(
      firmarDocumento(ruta, sesionCon("admin"), adminCon(createSignedUrl)),
    ).rejects.toBeInstanceOf(ErrorDocumento);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("falla con un mensaje claro si Storage devuelve error", async () => {
    const createSignedUrl = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    await expect(
      firmarDocumento(RUTA, sesionCon("admin"), adminCon(createSignedUrl)),
    ).rejects.toThrow("No se pudo generar el enlace del documento.");
  });
});
