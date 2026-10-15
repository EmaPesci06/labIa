import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/limpiar-documentos/route";
import * as adminModulo from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import * as Sentry from "@sentry/nextjs";

import { limpiarDocumentos, vencidosParaBorrar, type FilaRetencion } from "./limpieza";

// Hoy de la prueba: 14 de noviembre de 2026. Todas las fechas son falsas, para no depender del reloj.
const AHORA = new Date("2026-11-14T06:00:00.000Z");

const fila = (parcial: Partial<FilaRetencion> & Pick<FilaRetencion, "id">): FilaRetencion => ({
  storage_path: `ruta-${parcial.id}.jpg`,
  borrar_despues_de: null,
  archivo_borrado_at: null,
  ...parcial,
});

describe("vencidosParaBorrar", () => {
  it("toma solo los archivos cuya fecha de borrado ya pasó", () => {
    const filas = [
      fila({ id: "vencido", borrar_despues_de: "2026-11-13T23:00:00.000Z" }),
      fila({ id: "justo-hoy", borrar_despues_de: "2026-11-14T06:00:00.000Z" }),
      fila({ id: "futuro", borrar_despues_de: "2026-11-15T00:00:00.000Z" }),
      fila({ id: "sin-fecha", borrar_despues_de: null }),
    ];
    const ids = vencidosParaBorrar(filas, AHORA).map((f) => f.id);
    expect(ids).toEqual(["vencido", "justo-hoy"]);
  });

  it("no vuelve a tomar un archivo que ya se borró", () => {
    const filas = [
      fila({
        id: "ya-borrado",
        borrar_despues_de: "2026-10-01T00:00:00.000Z",
        archivo_borrado_at: "2026-10-02T06:00:00.000Z",
      }),
    ];
    expect(vencidosParaBorrar(filas, AHORA)).toEqual([]);
  });

  it("un documento revisado sin borrar_despues_de no se borra (la base fija la fecha al decidir)", () => {
    const filas = [fila({ id: "revisado-sin-fecha", borrar_despues_de: null })];
    expect(vencidosParaBorrar(filas, AHORA)).toEqual([]);
  });

  it("un documento vence exactamente en su fecha de borrado, no antes", () => {
    const manana = new Date(AHORA.getTime() + 24 * 60 * 60 * 1000);
    const filas = [
      fila({ id: "en-la-fecha", borrar_despues_de: AHORA.toISOString() }),
      fila({ id: "manana", borrar_despues_de: manana.toISOString() }),
    ];
    expect(vencidosParaBorrar(filas, AHORA).map((f) => f.id)).toEqual(["en-la-fecha"]);
  });
});

/** Cliente de Supabase simulado: registra qué borró el job y qué marcó. */
function adminFalso(opciones: {
  vencidas?: FilaRetencion[];
  huerfanos?: string[];
  errorStorage?: boolean;
  errorHuerfanos?: boolean;
}) {
  const remove = vi.fn(async (_rutas: string[]) =>
    opciones.errorStorage ? { data: null, error: { message: "boom" } } : { data: [], error: null },
  );
  const cadena = {
    select: () => cadena,
    is: () => cadena,
    not: () => cadena,
    lte: async () => ({ data: opciones.vencidas ?? [], error: null }),
  };
  const update = vi.fn(() => ({ in: async () => ({ error: null }) }));
  const rpc = vi.fn(async () =>
    opciones.errorHuerfanos
      ? { data: null, error: { message: "fallo al listar" } }
      : { data: opciones.huerfanos ?? [], error: null },
  );
  const admin = {
    from: (tabla: string) => {
      if (tabla !== "verificaciones") throw new Error(`tabla inesperada ${tabla}`);
      return { ...cadena, update };
    },
    storage: { from: () => ({ remove }) },
    rpc,
  } as unknown as SupabaseClient<Database>;
  return { admin, remove, update, rpc };
}

describe("limpiarDocumentos", () => {
  it("borra los vencidos, los marca y borra los huérfanos de más de 24 h", async () => {
    const { admin, remove, update, rpc } = adminFalso({
      vencidas: [
        fila({
          id: "v1",
          storage_path: "a/dni_frente-1.jpg",
          borrar_despues_de: "2026-11-01T00:00:00.000Z",
        }),
        fila({
          id: "v2",
          storage_path: "a/dni_dorso-2.jpg",
          borrar_despues_de: "2026-11-02T00:00:00.000Z",
        }),
      ],
      huerfanos: ["b/antecedentes-9.pdf"],
    });

    const resultado = await limpiarDocumentos(admin, AHORA);

    expect(remove).toHaveBeenNthCalledWith(1, ["a/dni_frente-1.jpg", "a/dni_dorso-2.jpg"]);
    expect(update).toHaveBeenCalledWith({ archivo_borrado_at: AHORA.toISOString() });
    expect(rpc).toHaveBeenCalledWith("documentos_huerfanos", {
      p_antes: "2026-11-13T06:00:00.000Z",
    });
    expect(remove).toHaveBeenNthCalledWith(2, ["b/antecedentes-9.pdf"]);
    expect(resultado).toEqual({ borrados: 2, huerfanos: 1, fallidos: 0 });
  });

  it("si Storage falla, no marca como borrado y cuenta el fallo para reintentar", async () => {
    const { admin, update } = adminFalso({
      vencidas: [fila({ id: "v1", borrar_despues_de: "2026-11-01T00:00:00.000Z" })],
      errorStorage: true,
    });

    const resultado = await limpiarDocumentos(admin, AHORA);

    expect(update).not.toHaveBeenCalled();
    expect(resultado).toEqual({ borrados: 0, huerfanos: 0, fallidos: 1 });
  });

  it("si no se pueden listar los huérfanos, el error se propaga (no se traga)", async () => {
    const { admin } = adminFalso({ errorHuerfanos: true });
    await expect(limpiarDocumentos(admin, AHORA)).rejects.toThrow(
      "No se pudieron listar los archivos huérfanos.",
    );
  });

  it("si la consulta a la base falla, arroja un error controlado", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          is: () => ({
            not: () => ({ lte: async () => ({ data: null, error: { message: "x" } }) }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;
    await expect(limpiarDocumentos(admin, AHORA)).rejects.toThrow(
      "No se pudieron leer las verificaciones para limpieza.",
    );
  });

  it("sin nada vencido ni huérfano no toca el bucket", async () => {
    const { admin, remove, update } = adminFalso({});
    const resultado = await limpiarDocumentos(admin, AHORA);
    expect(remove).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(resultado).toEqual({ borrados: 0, huerfanos: 0, fallidos: 0 });
  });
});

describe("Route Handler /api/cron/limpiar-documentos", () => {
  const secretoOriginal = process.env.CRON_SECRET;
  const URL_CRON = "http://localhost:3000/api/cron/limpiar-documentos";

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123456";
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (secretoOriginal !== undefined) process.env.CRON_SECRET = secretoOriginal;
    else delete process.env.CRON_SECRET;
  });

  it("rechaza peticiones sin autorización (401)", async () => {
    const response = await GET(new NextRequest(URL_CRON));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No autorizado" });
  });

  it("rechaza peticiones con token inválido (401)", async () => {
    const response = await GET(
      new NextRequest(URL_CRON, { headers: { authorization: "Bearer token-invalido" } }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No autorizado" });
  });

  it("con CRON_SECRET válido ejecuta la limpieza (200)", async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { admin } = adminFalso({
      vencidas: [
        fila({
          id: "vencida-cron",
          storage_path: "user-1/dni_frente-cron.jpg",
          borrar_despues_de: ayer,
        }),
      ],
    });
    vi.spyOn(adminModulo, "crearClienteAdmin").mockReturnValue(admin);

    const response = await GET(
      new NextRequest(URL_CRON, { headers: { authorization: "Bearer test-secret-123456" } }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ borrados: 1, huerfanos: 0, fallidos: 0 });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("si la limpieza falla responde 500 y reporta el error a Sentry", async () => {
    const error = new Error("Conexión perdida con la base");
    vi.spyOn(adminModulo, "crearClienteAdmin").mockImplementation(() => {
      throw error;
    });

    const response = await GET(
      new NextRequest(URL_CRON, { headers: { authorization: "Bearer test-secret-123456" } }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "No se pudo limpiar los documentos" });
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
