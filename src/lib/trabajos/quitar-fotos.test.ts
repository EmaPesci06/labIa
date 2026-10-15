import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import { BUCKET_FOTOS_TRABAJOS, quitarFotosDelTrabajo } from "./quitar-fotos";

const CLIENTE = "11111111-1111-4111-8111-111111111111";
const TRABAJO = "22222222-2222-4222-8222-222222222222";

/** Storage falso: lista y borra una carpeta por vez, y registra las llamadas. */
function fakeStorage(opciones: {
  archivos?: { id: string | null; name: string }[];
  falla?: "list" | "remove";
}) {
  const list = vi.fn(async () =>
    opciones.falla === "list"
      ? { data: null, error: { message: "boom" } }
      : { data: opciones.archivos ?? [], error: null },
  );
  const remove = vi.fn(async () =>
    opciones.falla === "remove" ? { error: { message: "boom" } } : { error: null },
  );
  const from = vi.fn(() => ({ list, remove }));
  const cliente = { storage: { from } } as unknown as SupabaseClient<Database>;
  return { cliente, from, list, remove };
}

describe("quitarFotosDelTrabajo", () => {
  it("lista la carpeta del trabajo y borra todos sus archivos del bucket privado", async () => {
    const { cliente, from, list, remove } = fakeStorage({
      archivos: [
        { id: "a", name: "0-1.jpg" },
        { id: "b", name: "1-2.webp" },
      ],
    });

    const resultado = await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO);

    expect(from).toHaveBeenCalledWith(BUCKET_FOTOS_TRABAJOS);
    expect(list).toHaveBeenCalledWith(`${CLIENTE}/${TRABAJO}`, { limit: 1000 });
    expect(remove).toHaveBeenCalledWith([
      `${CLIENTE}/${TRABAJO}/0-1.jpg`,
      `${CLIENTE}/${TRABAJO}/1-2.webp`,
    ]);
    expect(resultado).toEqual({ ok: true, quitadas: 2 });
  });

  it("ignora las subcarpetas (su id es null) y no borra nada si no hay archivos", async () => {
    const { cliente, remove } = fakeStorage({ archivos: [{ id: null, name: "sub" }] });

    const resultado = await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO);

    expect(remove).not.toHaveBeenCalled();
    expect(resultado).toEqual({ ok: true, quitadas: 0 });
  });

  it("si listar falla, devuelve ok: false para que el job reintente", async () => {
    const { cliente, remove } = fakeStorage({ falla: "list" });

    expect(await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO)).toEqual({
      ok: false,
      quitadas: 0,
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("si borrar falla, devuelve ok: false", async () => {
    const { cliente } = fakeStorage({
      archivos: [{ id: "a", name: "0-1.jpg" }],
      falla: "remove",
    });

    expect(await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO)).toEqual({
      ok: false,
      quitadas: 0,
    });
  });
});
