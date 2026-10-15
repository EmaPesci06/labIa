import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/borrar-documentos/route";
import {
  borrarDocumentosVencidos,
  DIAS_RETENCION,
  vencidosParaBorrar,
  type FilaRetencion,
} from "@/lib/documentos/limpieza";
import * as adminModulo from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/tipos";

vi.mock("server-only", () => ({}));

// Fecha base para pruebas: 15 de noviembre de 2026
const AHORA = new Date("2026-11-15T12:00:00.000Z");

const filaEjemplo = (
  parcial: Partial<FilaRetencion> & Pick<FilaRetencion, "id">,
): FilaRetencion => {
  let borrarDespuesDe = parcial.borrar_despues_de;
  if (borrarDespuesDe === undefined) {
    borrarDespuesDe = parcial.revisado_at
      ? new Date(new Date(parcial.revisado_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
  }
  return {
    storage_path: `usuario-1/dni_frente-${parcial.id}.jpg`,
    estado: "aprobado",
    revisado_at: null,
    borrar_despues_de: borrarDespuesDe,
    archivo_borrado_at: null,
    ...parcial,
  };
};

describe("vencidosParaBorrar (reglas de retención)", () => {
  it("selecciona documentos revisados hace más de 30 días", () => {
    // 31 días atrás de AHORA
    const hace31Dias = new Date(AHORA.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    // 10 días atrás de AHORA
    const hace10Dias = new Date(AHORA.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const filas: FilaRetencion[] = [
      filaEjemplo({
        id: "mas-de-30-dias",
        revisado_at: hace31Dias,
        estado: "aprobado",
      }),
      filaEjemplo({
        id: "con-borrar-despues-de-vencido",
        borrar_despues_de: hace10Dias,
        estado: "aprobado",
      }),
      filaEjemplo({
        id: "menos-de-30-dias",
        revisado_at: hace10Dias,
        estado: "aprobado",
      }),
      filaEjemplo({
        id: "pendiente-no-revisado",
        revisado_at: null,
        estado: "pendiente",
      }),
      filaEjemplo({
        id: "ya-borrado",
        revisado_at: hace31Dias,
        archivo_borrado_at: hace10Dias,
        estado: "aprobado",
      }),
    ];

    const resultado = vencidosParaBorrar(filas, AHORA);
    const ids = resultado.map((f) => f.id);

    expect(ids).toContain("mas-de-30-dias");
    expect(ids).toContain("con-borrar-despues-de-vencido");
    expect(ids).not.toContain("menos-de-30-dias");
    expect(ids).not.toContain("pendiente-no-revisado");
    expect(ids).not.toContain("ya-borrado");
    expect(ids).toHaveLength(2);
  });

  it("no selecciona documentos no revisados o pendientes sin fecha de borrado", () => {
    const filas: FilaRetencion[] = [
      filaEjemplo({ id: "p1", estado: "pendiente", revisado_at: null }),
      filaEjemplo({ id: "p2", estado: null, revisado_at: null }),
    ];

    expect(vencidosParaBorrar(filas, AHORA)).toEqual([]);
  });

  it("respeta la constante DIAS_RETENCION (30 días)", () => {
    expect(DIAS_RETENCION).toBe(30);

    const justo30Dias = new Date(AHORA.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const casi30Dias = new Date(AHORA.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();

    const filas = [
      filaEjemplo({ id: "exacto-30", revisado_at: justo30Dias, estado: "aprobado" }),
      filaEjemplo({ id: "menos-30", revisado_at: casi30Dias, estado: "aprobado" }),
    ];

    const ids = vencidosParaBorrar(filas, AHORA).map((f) => f.id);
    expect(ids).toEqual(["exacto-30"]);
  });
});

/** Mock builder para el cliente Supabase Admin */
function mockClienteAdmin(opciones: {
  filas?: FilaRetencion[];
  errorConsulta?: boolean;
  errorStorage?: boolean;
  errorUpdate?: boolean;
  huerfanos?: string[];
  errorHuerfanos?: boolean;
}) {
  const rutasEliminadas: string[] = [];
  const filasActualizadas: { ids: string[]; valores: Record<string, unknown> }[] = [];

  const removeStorage = vi.fn(async (rutas: string[]) => {
    if (opciones.errorStorage) {
      return { data: null, error: { message: "Error de Storage" } };
    }
    rutasEliminadas.push(...rutas);
    return { data: rutas.map((name) => ({ name })), error: null };
  });

  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    is: vi.fn(() => queryBuilder),
    not: vi.fn(() => queryBuilder),
    lte: vi.fn(async () => {
      if (opciones.errorConsulta) {
        return { data: null, error: { message: "Error al consultar verificaciones" } };
      }
      return { data: opciones.filas ?? [], error: null };
    }),
    update: vi.fn((valores: Record<string, unknown>) => ({
      in: vi.fn(async (_campo: string, ids: string[]) => {
        if (opciones.errorUpdate) {
          return { error: { message: "Error al actualizar verificaciones" } };
        }
        filasActualizadas.push({ ids, valores });
        return { error: null };
      }),
    })),
  };

  const rpc = vi.fn(async (nombre: string, _args: Record<string, unknown>) => {
    if (nombre === "documentos_huerfanos") {
      if (opciones.errorHuerfanos) {
        return { data: null, error: { message: "Error al listar huérfanos" } };
      }
      return { data: opciones.huerfanos ?? [], error: null };
    }
    return { data: null, error: null };
  });

  const cliente = {
    from: vi.fn((tabla: string) => {
      if (tabla === "verificaciones") return queryBuilder;
      throw new Error(`Tabla no esperada: ${tabla}`);
    }),
    storage: {
      from: vi.fn((bucket: string) => {
        if (bucket === "documentos") return { remove: removeStorage };
        throw new Error(`Bucket no esperado: ${bucket}`);
      }),
    },
    rpc,
  } as unknown as SupabaseClient<Database>;

  return {
    cliente,
    rutasEliminadas,
    filasActualizadas,
    removeStorage,
    queryBuilder,
    rpc,
  };
}

describe("borrarDocumentosVencidos (función principal)", () => {
  it("purga de storage los documentos de más de 30 días y marca la base de datos", async () => {
    const hace40Dias = new Date(AHORA.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const hace5Dias = new Date(AHORA.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const mock = mockClienteAdmin({
      filas: [
        filaEjemplo({
          id: "vencida-1",
          storage_path: "user-1/dni_frente-100.jpg",
          revisado_at: hace40Dias,
          estado: "aprobado",
        }),
        filaEjemplo({
          id: "vencida-2",
          storage_path: "user-1/dni_dorso-100.jpg",
          revisado_at: hace40Dias,
          estado: "aprobado",
        }),
        filaEjemplo({
          id: "reciente",
          storage_path: "user-2/dni_frente-200.jpg",
          revisado_at: hace5Dias,
          estado: "aprobado",
        }),
        filaEjemplo({
          id: "pendiente",
          storage_path: "user-3/dni_frente-300.jpg",
          revisado_at: null,
          estado: "pendiente",
        }),
      ],
      huerfanos: ["user-orphan/archivo-abandonado-1.pdf"],
    });

    const resultado = await borrarDocumentosVencidos(mock.cliente, AHORA);

    // Debe haber eliminado solo los archivos vencidos y el huérfano
    expect(mock.rutasEliminadas).toContain("user-1/dni_frente-100.jpg");
    expect(mock.rutasEliminadas).toContain("user-1/dni_dorso-100.jpg");
    expect(mock.rutasEliminadas).toContain("user-orphan/archivo-abandonado-1.pdf");
    expect(mock.rutasEliminadas).not.toContain("user-2/dni_frente-200.jpg");
    expect(mock.rutasEliminadas).not.toContain("user-3/dni_frente-300.jpg");

    // Debe haber marcado en BD los vencidos con archivo_borrado_at
    expect(mock.filasActualizadas).toHaveLength(1);
    expect(mock.filasActualizadas[0]?.ids).toEqual(["vencida-1", "vencida-2"]);
    expect(mock.filasActualizadas[0]?.valores).toEqual({ archivo_borrado_at: AHORA.toISOString() });

    expect(resultado).toEqual({
      borrados: 2,
      huerfanos: 1,
      fallidos: 0,
    });
  });

  it("si Storage falla, no marca como borrado y cuenta los fallidos", async () => {
    const hace35Dias = new Date(AHORA.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const mock = mockClienteAdmin({
      filas: [
        filaEjemplo({
          id: "vencida-fallida",
          storage_path: "user-1/antecedentes-50.pdf",
          revisado_at: hace35Dias,
          estado: "aprobado",
        }),
      ],
      errorStorage: true,
    });

    const resultado = await borrarDocumentosVencidos(mock.cliente, AHORA);

    expect(mock.filasActualizadas).toHaveLength(0);
    expect(resultado).toEqual({
      borrados: 0,
      huerfanos: 0,
      fallidos: 1,
    });
  });

  it("si la consulta a la base falla, arroja un Error controlado", async () => {
    const mock = mockClienteAdmin({ errorConsulta: true });
    await expect(borrarDocumentosVencidos(mock.cliente, AHORA)).rejects.toThrow(
      "No se pudieron leer las verificaciones",
    );
  });
});

describe("Route Handler /api/cron/borrar-documentos", () => {
  const secretoOriginal = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123456";
    vi.restoreAllMocks();
  });

  it("rechaza peticiones sin encabezado de autorización (401)", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/borrar-documentos");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "No autorizado" });
  });

  it("rechaza peticiones con token inválido (401)", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/borrar-documentos", {
      headers: { authorization: "Bearer token-invalido" },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "No autorizado" });
  });

  it("acepta peticiones con CRON_SECRET válido y ejecuta la limpieza (200)", async () => {
    const hace35Dias = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const mock = mockClienteAdmin({
      filas: [
        filaEjemplo({
          id: "vencida-cron",
          storage_path: "user-1/dni_frente-cron.jpg",
          revisado_at: hace35Dias,
          estado: "rechazado",
        }),
      ],
    });

    vi.spyOn(adminModulo, "crearClienteAdmin").mockReturnValue(mock.cliente);

    const request = new NextRequest("http://localhost:3000/api/cron/borrar-documentos", {
      headers: { authorization: "Bearer test-secret-123456" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      borrados: 1,
      huerfanos: 0,
      fallidos: 0,
    });
  });

  it("devuelve 500 si ocurre un fallo durante la ejecución", async () => {
    vi.spyOn(adminModulo, "crearClienteAdmin").mockImplementation(() => {
      throw new Error("Conexión perdida con la base");
    });

    const request = new NextRequest("http://localhost:3000/api/cron/borrar-documentos", {
      headers: { authorization: "Bearer test-secret-123456" },
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({ error: "No se pudieron borrar los documentos" });
  });

  // Restaurar el secreto original al terminar
  it("limpieza de configuración de entorno", () => {
    if (secretoOriginal !== undefined) {
      process.env.CRON_SECRET = secretoOriginal;
    } else {
      delete process.env.CRON_SECRET;
    }
  });
});
