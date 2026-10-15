import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

vi.mock("server-only", () => ({}));

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
});

/** Cliente de Supabase simulado: registra qué borró el job y qué marcó. */
function adminFalso(opciones: {
  vencidas?: FilaRetencion[];
  huerfanos?: string[];
  errorStorage?: boolean;
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
  const rpc = vi.fn(async () => ({ data: opciones.huerfanos ?? [], error: null }));
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

  it("sin nada vencido ni huérfano no toca el bucket", async () => {
    const { admin, remove, update } = adminFalso({});
    const resultado = await limpiarDocumentos(admin, AHORA);
    expect(remove).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(resultado).toEqual({ borrados: 0, huerfanos: 0, fallidos: 0 });
  });
});
