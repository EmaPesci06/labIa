import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import { borrarCuentaDeUsuario, ErrorBorrado } from "./borrado";

vi.mock("server-only", () => ({}));

const UID = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";

/** Admin falso con un Storage en memoria: `bucket -> rutas`. */
function crearAdmin(opciones: { falla?: "borrar-usuario" | "listar" } = {}) {
  const archivos: Record<string, Set<string>> = {
    fotos: new Set([
      `perfiles/${UID}/1.jpg`,
      `trabajos-hechos/${UID}/1.jpg`,
      `trabajos-hechos/${UID}/2.jpg`,
      "trabajos/t1/a.jpg",
      `perfiles/${OTRO}/1.jpg`,
    ]),
    documentos: new Set([
      `${UID}/dni_frente-1.jpg`,
      `${UID}/antecedentes-2.pdf`,
      `${OTRO}/dni_frente-1.jpg`,
    ]),
  };
  const eventos: string[] = [];
  const insertar = vi.fn(async () => ({ error: null }));
  const deleteUser = vi.fn(async () => {
    eventos.push("deleteUser");
    return { error: opciones.falla === "borrar-usuario" ? { message: "x" } : null };
  });

  const admin = {
    from: (tabla: string) =>
      tabla === "trabajos"
        ? { select: () => ({ eq: async () => ({ data: [{ id: "t1" }], error: null }) }) }
        : { insert: insertar },
    storage: {
      from: (bucket: string) => ({
        list: async (carpeta: string) => ({
          data:
            opciones.falla === "listar"
              ? null
              : [...(archivos[bucket] ?? [])]
                  .filter((r) => r.startsWith(`${carpeta}/`))
                  .map((r) => ({ id: "obj", name: r.slice(carpeta.length + 1) })),
          error: opciones.falla === "listar" ? { message: "x" } : null,
        }),
        remove: async (rutas: string[]) => {
          eventos.push(`remove:${bucket}`);
          for (const ruta of rutas) archivos[bucket]?.delete(ruta);
          return { error: null };
        },
      }),
    },
    auth: { admin: { deleteUser } },
  } as unknown as SupabaseClient<Database>;

  return { admin, archivos, eventos, insertar, deleteUser };
}

describe("borrarCuentaDeUsuario", () => {
  it("borra los archivos de la persona y la cuenta, y deja el registro sin datos", async () => {
    const { admin, archivos, eventos, insertar, deleteUser } = crearAdmin();
    await borrarCuentaDeUsuario(admin, UID);

    // No queda ningún archivo con ese uid ni de sus trabajos; los de otra persona siguen.
    expect([...(archivos.fotos ?? [])]).toEqual([`perfiles/${OTRO}/1.jpg`]);
    expect([...(archivos.documentos ?? [])]).toEqual([`${OTRO}/dni_frente-1.jpg`]);

    expect(deleteUser).toHaveBeenCalledWith(UID);
    // Primero los archivos, después la cuenta.
    expect(eventos.at(-1)).toBe("deleteUser");
    expect(insertar).toHaveBeenCalledWith({ accion: "cuenta_borrada", objetivo_id: UID });
  });

  it("si falla el Storage no toca la cuenta", async () => {
    const { admin, deleteUser, insertar } = crearAdmin({ falla: "listar" });
    await expect(borrarCuentaDeUsuario(admin, UID)).rejects.toBeInstanceOf(ErrorBorrado);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(insertar).not.toHaveBeenCalled();
  });

  it("si falla el borrado de la cuenta no registra nada", async () => {
    const { admin, insertar } = crearAdmin({ falla: "borrar-usuario" });
    await expect(borrarCuentaDeUsuario(admin, UID)).rejects.toBeInstanceOf(ErrorBorrado);
    expect(insertar).not.toHaveBeenCalled();
  });
});
