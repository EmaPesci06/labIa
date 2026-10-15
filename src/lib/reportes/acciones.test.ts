import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockInsert,
  mockSelect,
  mockLimitarPersistente,
  mockLimitarPorIp,
  mockRegistrarEventoServidor,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockLimitarPersistente: vi.fn(),
  mockLimitarPorIp: vi.fn(),
  mockRegistrarEventoServidor: vi.fn(),
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: vi.fn(),
}));

vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPersistente: mockLimitarPersistente,
  limitarPorIp: mockLimitarPorIp,
}));

vi.mock("@/lib/metricas-servidor", () => ({
  registrarEventoServidor: mockRegistrarEventoServidor,
}));

vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: vi.fn().mockReturnValue(true),
  crearClienteServidor: vi.fn().mockResolvedValue({
    from: vi.fn((tabla: string) => {
      if (tabla === "reportes") {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockSelect,
          }),
        };
      }
      if (tabla === "trabajos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { cliente_id: "otro-cliente" } }),
          }),
        };
      }
      if (tabla === "resenas") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { autor_id: "otro-autor" } }),
          }),
        };
      }
      return {};
    }),
  }),
}));

import { obtenerSesion } from "@/lib/sesion";
import { supabaseConfigurado } from "@/lib/supabase/servidor";
import { enviarReporte } from "./acciones";
import { ESTADO_REPORTE_INICIAL } from "./estado";

const UUID_OBJETIVO = "22222222-2222-4222-8222-222222222222";
const UUID_USUARIO = "11111111-1111-4111-8111-111111111111";

describe("enviarReporte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimitarPersistente.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    mockLimitarPorIp.mockResolvedValue({ permitido: true, segundosParaReintentar: 0 });
    mockSelect.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("rechaza si faltan datos obligatorios o formato inválido", async () => {
    const formData = new FormData();
    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.exito).toBeUndefined();
    expect(res.errores?.motivo).toBeDefined();
  });

  it("rechaza si el usuario no tiene sesión iniciada", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "datos_falsos");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.mensaje).toBe("Necesitás iniciar sesión para enviar un reporte.");
  });

  it("rechaza si se supera el rate limit de 10 reportes al día", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });
    mockLimitarPersistente.mockResolvedValue({ permitido: false, segundosParaReintentar: 3600 });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "datos_falsos");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.mensaje).toContain("Alcanzaste el límite de 10 reportes por día");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rechaza si la IP supera su tope diario aunque la cuenta tenga cupo (M-05)", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });
    mockLimitarPorIp.mockResolvedValue({ permitido: false, segundosParaReintentar: 3600 });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "datos_falsos");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.mensaje).toBe(
      "Hiciste demasiados reportes desde tu conexión hoy. Probá de nuevo mañana.",
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("cuenta la IP con la clave 'reporte' y 30 reportes por día (M-05)", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "estafa");

    await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(mockLimitarPorIp).toHaveBeenCalledWith("reporte", {
      maximo: 30,
      ventanaMs: 24 * 60 * 60 * 1000,
    });
  });

  it("cuenta el intento con la clave y la regla persistentes de reportes", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "estafa");

    await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(mockLimitarPersistente).toHaveBeenCalledWith(`reporte:${UUID_USUARIO}`, {
      maximo: 10,
      ventanaMs: 24 * 60 * 60 * 1000,
    });
  });

  it("rechaza el autorreporte de un perfil propio", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_USUARIO); // mismo id que la sesión
    formData.set("motivo", "datos_falsos");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.mensaje).toBe("No podés reportar tu propio perfil.");
  });

  it("rechaza si ya envió un reporte sobre ese objetivo", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });
    mockSelect.mockResolvedValue({ data: { id: "reporte-existente" } });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "estafa");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.mensaje).toBe("Ya enviaste un reporte sobre este contenido.");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserta el reporte y envía la métrica en éxito", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "estafa");
    formData.set("detalle", "Pidió seña por adelantado");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.exito).toBe(true);
    expect(res.motivoEnviado).toBe("estafa");
    expect(mockInsert).toHaveBeenCalledWith({
      autor_id: UUID_USUARIO,
      objetivo_tipo: "perfil",
      objetivo_id: UUID_OBJETIVO,
      motivo: "estafa",
      detalle: "Pidió seña por adelantado",
    });
    expect(mockRegistrarEventoServidor).toHaveBeenCalledWith(UUID_USUARIO, "reporte_enviado", {
      motivo: "estafa",
    });
  });

  it("sin Supabase configurado, fuera de desarrollo no informa un envío exitoso", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      usuario: { id: UUID_USUARIO, email: "test@example.com" },
      rol: "cliente",
      normasVersion: "1.0",
      perfil: { nombre: "Test", apellido: null, nombreVisible: "Test", completo: true },
    });
    vi.mocked(supabaseConfigurado).mockReturnValueOnce(false);

    const formData = new FormData();
    formData.set("objetivoTipo", "perfil");
    formData.set("objetivoId", UUID_OBJETIVO);
    formData.set("motivo", "estafa");

    const res = await enviarReporte(ESTADO_REPORTE_INICIAL, formData);
    expect(res.exito).toBeFalsy();
    expect(res.mensaje).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
