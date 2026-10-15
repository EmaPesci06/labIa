import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, cargarDatosRegistro, redirect } = vi.hoisted(() => ({
  rpc: vi.fn(),
  cargarDatosRegistro: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/metricas-servidor", () => ({ registrarEventoServidor: vi.fn() }));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPersistente: async () => ({ permitido: true, segundosParaReintentar: 0 }),
}));
vi.mock("@/lib/registro/borrador", () => ({ cargarDatosRegistro }));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-prof" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { rol: "profesional", normas_version: null } }),
        }),
      }),
    }),
    rpc,
  }),
}));

import { VERSION_NORMAS } from "@/lib/normas";

import { aceptarNormas } from "./normas";

const datos = () => {
  const fd = new FormData();
  fd.set("acepto", "on");
  fd.set("version", VERSION_NORMAS);
  return fd;
};

const verificado = (tipo: string) => ({
  id: `v-${tipo}`,
  tipo,
  estado: "pendiente" as const,
  motivoRechazo: null,
  createdAt: "2026-10-14T12:00:00Z",
});

describe("aceptarNormas: chequeo de documentos en la acción (LAB-43)", () => {
  beforeEach(() => {
    rpc.mockReset();
    redirect.mockReset();
    cargarDatosRegistro.mockReset();
  });

  it("rechaza si faltan documentos y no llama a la RPC", async () => {
    cargarDatosRegistro.mockResolvedValue({
      verificaciones: [verificado("dni_frente")],
      borrador: { oficios: ["plomeria"] },
    });

    const estado = await aceptarNormas({}, datos());

    expect(estado.mensaje).toBe(
      "Te faltan documentos de verificación. Subilos antes de aceptar las normas.",
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("exige matrícula a quien tiene el oficio gas", async () => {
    cargarDatosRegistro.mockResolvedValue({
      verificaciones: [
        verificado("dni_frente"),
        verificado("dni_dorso"),
        verificado("antecedentes"),
      ],
      borrador: { oficios: ["gas"] },
    });

    const estado = await aceptarNormas({}, datos());

    expect(estado.mensaje).toBeDefined();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("acepta cuando están todos los documentos obligatorios", async () => {
    cargarDatosRegistro.mockResolvedValue({
      verificaciones: [
        verificado("dni_frente"),
        verificado("dni_dorso"),
        verificado("antecedentes"),
      ],
      borrador: { oficios: ["plomeria"] },
    });
    rpc.mockResolvedValue({ error: null });

    await aceptarNormas({}, datos());

    expect(rpc).toHaveBeenCalledWith("aceptar_normas", { p_version: VERSION_NORMAS });
  });
});
