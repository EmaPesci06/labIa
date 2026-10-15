import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import { limpiarFotosTrabajos } from "./limpieza-fotos";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ crearClienteAdmin: vi.fn() }));

type Fila = { id: string; fotos: string[] };

/**
 * Admin falso: devuelve `filas` como trabajos vencidos, registra qué rutas se quitan del bucket y
 * qué trabajos se marcan como limpios. `fallaStorage` simula un error de Storage.
 */
function fakeAdmin(filas: Fila[], opciones: { fallaStorage?: boolean } = {}) {
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
        remove: async (rutas: string[]) => {
          quitadas.push({ bucket, rutas });
          return { error: opciones.fallaStorage ? { message: "boom" } : null };
        },
      }),
    },
  } as unknown as SupabaseClient<Database>;
  return { admin, quitadas, marcados };
}

const RUTA = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/0-1.jpg";

describe("limpiarFotosTrabajos", () => {
  it("quita las fotos del bucket privado y deja el trabajo limpio", async () => {
    const { admin, quitadas, marcados } = fakeAdmin([{ id: "t1", fotos: [RUTA] }]);

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas).toEqual([{ bucket: "fotos-trabajos", rutas: [RUTA] }]);
    expect(marcados).toEqual([{ id: "t1", valores: { fotos: [], fotos_borrar_despues_de: null } }]);
    expect(resultado).toEqual({ trabajos: 1, fotosBorradas: 1, fallidos: 0 });
  });

  it("un trabajo sin fotos solo se marca como limpio", async () => {
    const { admin, quitadas, marcados } = fakeAdmin([{ id: "t2", fotos: [] }]);

    const resultado = await limpiarFotosTrabajos(admin, new Date());

    expect(quitadas).toEqual([]);
    expect(marcados).toHaveLength(1);
    expect(resultado).toEqual({ trabajos: 1, fotosBorradas: 0, fallidos: 0 });
  });

  it("si Storage falla, no marca el trabajo y lo cuenta como fallido para reintentar", async () => {
    const { admin, marcados } = fakeAdmin([{ id: "t3", fotos: [RUTA] }], { fallaStorage: true });

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
