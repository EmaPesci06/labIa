import { beforeEach, describe, expect, it, vi } from "vitest";

import { MENSAJE_ALTA_INCOMPLETA } from "@/lib/auth/alta";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { guardarDatos, guardarFotoDePerfil } from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./borrado", () => ({ borrarCuentaDeUsuario: vi.fn() }));
vi.mock("./proveedor", () => ({ ingresoReciente: vi.fn(), tieneContrasena: vi.fn() }));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
}));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));

const UID = "11111111-1111-4111-8111-111111111111";

/** Supabase simulado con la fila propia de `usuarios` y un registro de las RPC y escrituras. */
function preparar(fila: { rol: string; estado: string; terminos_aceptados_at: string | null }) {
  const escrituras: string[] = [];
  const cliente = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: UID } } })) },
    rpc: vi.fn(async (nombre: string) => {
      escrituras.push(`rpc:${nombre}`);
      return { error: null };
    }),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: fila }) }),
      }),
      update: () => {
        escrituras.push("update");
        return { eq: async () => ({ error: null }) };
      },
    }),
  };
  vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
  return escrituras;
}

function datos() {
  const d = new FormData();
  d.set("nombreCompleto", "Laura Fernández");
  d.set("whatsapp", "2235550123");
  d.set("barrio", "17");
  return d;
}

describe("Mis datos exige el alta completa del cliente (LAB-81)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
  });

  it("un cliente sin mayor de 18 y términos no guarda su WhatsApp ni su barrio", async () => {
    const escrituras = preparar({ rol: "cliente", estado: "activa", terminos_aceptados_at: null });

    const estado = await guardarDatos({}, datos());

    expect(estado.mensaje).toBe(MENSAJE_ALTA_INCOMPLETA);
    expect(escrituras).toEqual([]);
  });

  it("tampoco cambia la foto de perfil", async () => {
    const escrituras = preparar({ rol: "cliente", estado: "activa", terminos_aceptados_at: null });

    const r = await guardarFotoDePerfil(null);

    expect(r).toEqual({ ok: false, mensaje: MENSAJE_ALTA_INCOMPLETA });
    expect(escrituras).toEqual([]);
  });

  it("con el consentimiento guardado, guarda", async () => {
    const escrituras = preparar({
      rol: "cliente",
      estado: "activa",
      terminos_aceptados_at: "2026-11-20T12:00:00Z",
    });

    const estado = await guardarDatos({}, datos());

    expect(estado.exito).toBe("Guardamos tus cambios.");
    expect(escrituras).toContain("rpc:actualizar_whatsapp");
  });

  it("un profesional no necesita esta casilla", async () => {
    preparar({ rol: "profesional", estado: "activa", terminos_aceptados_at: null });

    const estado = await guardarDatos({}, datos());

    expect(estado.exito).toBe("Guardamos tus cambios.");
  });
});
