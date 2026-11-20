// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { guardarDatosDeCliente } from "@/lib/auth/datos-de-cliente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sitio", () => ({ urlDelSitio: () => "https://labia.test" }));
vi.mock("@/lib/metricas-servidor", () => ({ registrarEventoServidor: vi.fn() }));
vi.mock("@/lib/auth/datos-de-cliente", () => ({ guardarDatosDeCliente: vi.fn(async () => true) }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));

type Fila = {
  rol: "cliente" | "profesional";
  nombre: string | null;
  apellido: string | null;
  whatsapp: string | null;
  terminos_aceptados_at: string | null;
};

/** Supabase simulado: una sesión canjeada por código, la fila de `usuarios` y la metadata del usuario. */
function preparar(fila: Fila, metadata: Record<string, unknown>) {
  const cliente = {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({
        data: { user: { id: "u-1", user_metadata: { rol: "cliente", ...metadata } } },
      })),
      updateUser: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => ({ error: null })),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fila }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  };
  vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
}

const pedir = () =>
  GET(new NextRequest("https://labia.test/api/auth/callback?code=abc&rol=cliente"));
const destino = (r: Response) => r.headers.get("location");

const METADATA_VALIDA = { whatsapp: "2235550123", barrio_id: "17" };
const ACEPTADO = "2026-11-20T12:00:00Z";

describe("callback de auth: alta de cliente (LAB-81)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(guardarDatosDeCliente).mockResolvedValue(true);
  });

  it("una cuenta de Google con WhatsApp y barrio cargados a mano en la metadata no saltea la casilla", async () => {
    preparar(
      {
        rol: "cliente",
        nombre: "Gaby",
        apellido: null,
        whatsapp: null,
        terminos_aceptados_at: null,
      },
      METADATA_VALIDA,
    );

    const r = await pedir();

    expect(destino(r)).toBe("https://labia.test/registro/cliente/completar");
    expect(guardarDatosDeCliente).not.toHaveBeenCalled();
  });

  it("un alta con email, con el consentimiento ya grabado, aplica WhatsApp y barrio y entra a /inicio", async () => {
    preparar(
      {
        rol: "cliente",
        nombre: "Emi",
        apellido: null,
        whatsapp: null,
        terminos_aceptados_at: ACEPTADO,
      },
      METADATA_VALIDA,
    );

    const r = await pedir();

    expect(guardarDatosDeCliente).toHaveBeenCalledWith(expect.anything(), "u-1", {
      whatsapp: "+5492235550123",
      barrioId: 17,
    });
    expect(destino(r)).toBe("https://labia.test/inicio");
  });

  it("con el consentimiento pero una metadata inválida, termina en 'Un último paso'", async () => {
    preparar(
      {
        rol: "cliente",
        nombre: "Emi",
        apellido: null,
        whatsapp: null,
        terminos_aceptados_at: ACEPTADO,
      },
      { whatsapp: "no es un teléfono", barrio_id: "17" },
    );

    const r = await pedir();

    expect(guardarDatosDeCliente).not.toHaveBeenCalled();
    expect(destino(r)).toBe("https://labia.test/registro/cliente/completar");
  });

  it("un cliente con WhatsApp pero sin el consentimiento vuelve a completar el alta", async () => {
    preparar(
      {
        rol: "cliente",
        nombre: "Gus",
        apellido: null,
        whatsapp: "+5492235550123",
        terminos_aceptados_at: null,
      },
      {},
    );

    const r = await pedir();

    expect(destino(r)).toBe("https://labia.test/registro/cliente/completar");
  });

  it("un cliente con el alta completa entra a /inicio", async () => {
    preparar(
      {
        rol: "cliente",
        nombre: "Ana",
        apellido: null,
        whatsapp: "+5492235550123",
        terminos_aceptados_at: ACEPTADO,
      },
      {},
    );

    const r = await pedir();

    expect(destino(r)).toBe("https://labia.test/inicio");
  });
});
