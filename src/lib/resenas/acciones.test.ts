import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockObtenerSesion, mockRolFalso, mockRegistrarEvento, mockRevalidatePath, mockFrom } =
  vi.hoisted(() => ({
    mockObtenerSesion: vi.fn(),
    mockRolFalso: vi.fn(() => null),
    mockRegistrarEvento: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockFrom: vi.fn(),
  }));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/auth/sesion-falsa", () => ({
  rolFalso: mockRolFalso,
}));

vi.mock("@/lib/metricas-servidor", () => ({
  registrarEventoServidor: mockRegistrarEvento,
}));

vi.mock("@/lib/rate-limit", () => ({
  limitarIntentos: () => ({ permitido: true, segundosParaReintentar: 0 }),
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: mockObtenerSesion,
}));

vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: async () => ({
    from: mockFrom,
  }),
}));

import { consultarElegibilidadResena, guardarResena } from "./acciones";

const CLIENTE_ID = "11111111-1111-4111-8111-111111111111";
const PROFESIONAL_ID = "22222222-2222-4222-8222-222222222222";
const TRABAJO_ID = "33333333-3333-4333-8333-333333333333";

describe("guardarResena", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolFalso.mockReturnValue(null);
    mockObtenerSesion.mockResolvedValue({
      usuario: { id: CLIENTE_ID },
      rol: "cliente",
    });
  });

  it("falla si no hay sesión iniciada", async () => {
    mockObtenerSesion.mockResolvedValue(null);

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sesión/i);
    }
  });

  it("falla si el rol no es cliente", async () => {
    mockObtenerSesion.mockResolvedValue({
      usuario: { id: CLIENTE_ID },
      rol: "profesional",
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/solo los clientes/i);
    }
  });

  it("falla si el usuario intenta reseñarse a sí mismo", async () => {
    const res = await guardarResena({
      profesionalId: CLIENTE_ID,
      puntaje: 5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/a vos mismo/i);
    }
  });

  it("falla si la cuenta no está activa", async () => {
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "suspendida" } }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/no está activa/i);
    }
  });

  it("falla si el cliente no es elegible (sin contacto ni trabajo elegido)", async () => {
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "activa" } }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === "trabajos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 5,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/contactaste o contrataste/i);
    }
  });

  it("guarda una reseña nueva exitosamente si tiene contacto", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: "resena-123" }, error: null }),
      }),
    });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "activa" } }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "contacto-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === "resenas") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
          insert: insertMock,
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 5,
      texto: "Excelente atención y puntualidad.",
      trabajoId: TRABAJO_ID,
    });

    expect(res).toEqual({
      ok: true,
      id: "resena-123",
      accion: "creada",
    });

    expect(insertMock).toHaveBeenCalledWith({
      autor_id: CLIENTE_ID,
      profesional_id: PROFESIONAL_ID,
      trabajo_id: TRABAJO_ID,
      puntaje: 5,
      texto: "Excelente atención y puntualidad.",
    });

    expect(mockRegistrarEvento).toHaveBeenCalledWith(CLIENTE_ID, "resena_publicada", {
      puntaje: 5,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/profesionales/${PROFESIONAL_ID}`);
  });

  it("actualiza una reseña si se edita dentro de las 24 horas", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: async () => ({ error: null }),
    });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "activa" } }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "contacto-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === "resenas") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "resena-existente",
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // hace 2 horas
                  },
                }),
              }),
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 4,
      texto: "Comentario actualizado",
    });

    expect(res).toEqual({
      ok: true,
      id: "resena-existente",
      accion: "actualizada",
    });
    expect(updateMock).toHaveBeenCalledWith({
      puntaje: 4,
      texto: "Comentario actualizado",
    });
  });

  it("rechaza editar una reseña pasada las 24 horas", async () => {
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "activa" } }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "contacto-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === "resenas") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "resena-vieja",
                    created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // hace 25 horas
                  },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 3,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/24 horas/i);
    }
  });

  it("registra un reporte de moderación para puntajes 1 y 2", async () => {
    const insertReporteMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "usuarios") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { estado: "activa" } }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "contacto-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      if (tabla === "resenas") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "resena-baja" }, error: null }),
            }),
          }),
        };
      }
      if (tabla === "reportes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
          insert: insertReporteMock,
        };
      }
      return {};
    });

    const res = await guardarResena({
      profesionalId: PROFESIONAL_ID,
      puntaje: 2,
      texto: "No fue una buena experiencia.",
    });

    expect(res.ok).toBe(true);
    expect(insertReporteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        autor_id: CLIENTE_ID,
        objetivo_tipo: "resena",
        objetivo_id: "resena-baja",
        motivo: "otro",
        estado: "abierto",
      }),
    );
  });
});

describe("consultarElegibilidadResena", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolFalso.mockReturnValue(null);
    mockObtenerSesion.mockResolvedValue({
      usuario: { id: CLIENTE_ID },
      rol: "cliente",
    });
  });

  it("devuelve puedeResenar: false si no hay sesión de cliente", async () => {
    mockObtenerSesion.mockResolvedValue(null);
    const res = await consultarElegibilidadResena(PROFESIONAL_ID);
    expect(res.puedeResenar).toBe(false);
  });

  it("devuelve puedeResenar: true si el cliente contactó al profesional", async () => {
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === "resenas") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        };
      }
      if (tabla === "contactos") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "c-1" } }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await consultarElegibilidadResena(PROFESIONAL_ID);
    expect(res.puedeResenar).toBe(true);
    expect(res.resenaPropia).toBeNull();
  });
});
