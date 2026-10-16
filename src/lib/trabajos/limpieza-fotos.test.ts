import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import { limpiarFotosTrabajos } from "./limpieza-fotos";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ crearClienteAdmin: vi.fn() }));

type Fila = { id: string; cliente_id: string; fotos: string[] };

/**
 * Admin falso: devuelve `filas` como trabajos vencidos. Cada carpeta `<cliente>/<trabajo>/` lista
 * `archivos[trabajo]`. Registra qué rutas se quitan del bucket y qué trabajos se marcan como
 * limpios. `fallaStorage` simula un error de Storage.
 */
function fakeAdmin(
  filas: Fila[],
  archivos: Record<string, string[]> = {},
  opciones: { fallaStorage?: boolean } = {},
) {
  const quitadas: { bucket: string; rutas: string[] }[] = [];
  const marcados: { id: string; valores: unknown }[] = [];
  const admin = {
    from: vi.fn(() => ({
      select: () => ({
        not: () => ({
          lte: () => ({ limit: async () => ({ data: filas, error: null }) }),
        }),
      }),
      update: (valores: unknown) => ({
        eq: async (_columna: string, id: string) => {
          marcados.push({ id, valores });
          return { error: null };
        },
      }),
    })),
    storage: {
      from: (bucket: string) => ({
        list: async (carpeta: string) => {
          const trabajo = carpeta.split("/")[1] ?? "";
          const nombres = archivos[trabajo] ?? [];
          return { data: nombres.map((name) => ({ id: "f", name })), error: null };
        },
        remove: async (rutas: string[]) => {
          quitadas.push({ bucket, rutas });
          return { error: opciones.fallaStorage ? { message: "boom" } : null };
        },
      }),
    },
  } as unknown as SupabaseClient<Database>;
  return { admin, quitadas, marcados };
}

const CLIENTE = "11111111-1111-4111-8111-111111111111";

describe("limpiarFotosTrabajos", () => {
  it("quita la carpeta completa del bucket privado y deja el trabajo limpio", async () => {
    const { admin, quitadas, marcados } = fakeAdmin(
      [{ id: "t1", cliente_id: CLIENTE, fotos: [] }],
      { t1: ["0-1.jpg", "1-2.jpg"] },
    );

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas).toEqual([
      {
        bucket: "fotos-trabajos",
        rutas: [`${CLIENTE}/t1/0-1.jpg`, `${CLIENTE}/t1/1-2.jpg`],
      },
    ]);
    expect(marcados).toEqual([{ id: "t1", valores: { fotos: [], fotos_borrar_despues_de: null } }]);
    expect(resultado).toEqual({ trabajos: 1, fotosBorradas: 2, fallidos: 0 });
  });

  it("aunque `trabajos.fotos` esté vacío, borra lo que quedó en la carpeta", async () => {
    const { admin, quitadas } = fakeAdmin([{ id: "t2", cliente_id: CLIENTE, fotos: [] }], {
      t2: ["0-9.jpg"],
    });

    await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas[0]?.rutas).toEqual([`${CLIENTE}/t2/0-9.jpg`]);
  });

  it("un trabajo sin archivos solo se marca como limpio", async () => {
    const { admin, quitadas, marcados } = fakeAdmin([{ id: "t3", cliente_id: CLIENTE, fotos: [] }]);

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas).toEqual([]);
    expect(marcados).toHaveLength(1);
    expect(resultado).toEqual({ trabajos: 1, fotosBorradas: 0, fallidos: 0 });
  });

  it("si Storage falla, no marca el trabajo y lo cuenta como fallido para reintentar", async () => {
    const { admin, marcados } = fakeAdmin(
      [{ id: "t4", cliente_id: CLIENTE, fotos: [] }],
      { t4: ["0-1.jpg"] },
      { fallaStorage: true },
    );

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(marcados).toEqual([]);
    expect(resultado).toEqual({ trabajos: 0, fotosBorradas: 0, fallidos: 1 });
  });

  it("sin trabajos vencidos no hace nada", async () => {
    const { admin, quitadas, marcados } = fakeAdmin([]);

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas).toEqual([]);
    expect(marcados).toEqual([]);
    expect(resultado).toEqual({ trabajos: 0, fotosBorradas: 0, fallidos: 0 });
  });
});
