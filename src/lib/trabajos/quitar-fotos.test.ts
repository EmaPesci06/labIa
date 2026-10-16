import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import {
  BUCKET_FOTOS_TRABAJOS,
  TAMANO_PAGINA_LISTADO,
  quitarFotosDelTrabajo,
} from "./quitar-fotos";

vi.mock("server-only", () => ({}));

const CLIENTE = "11111111-1111-4111-8111-111111111111";
const TRABAJO = "22222222-2222-4222-8222-222222222222";

/** Storage falso: lista con paginación sobre `archivos` y borra, registrando las llamadas. */
function fakeStorage(opciones: {
  archivos?: { id: string | null; name: string }[];
  falla?: "list" | "remove";
}) {
  const todos = opciones.archivos ?? [];
  const list = vi.fn(async (_carpeta: string, opts: { limit: number; offset: number }) =>
    opciones.falla === "list"
      ? { data: null, error: { message: "boom" } }
      : { data: todos.slice(opts.offset, opts.offset + opts.limit), error: null },
  );
  const remove = vi.fn(async (_rutas: string[]) =>
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
    expect(list).toHaveBeenCalledWith(`${CLIENTE}/${TRABAJO}`, {
      limit: TAMANO_PAGINA_LISTADO,
      offset: 0,
    });
    expect(remove).toHaveBeenCalledWith([
      `${CLIENTE}/${TRABAJO}/0-1.jpg`,
      `${CLIENTE}/${TRABAJO}/1-2.webp`,
    ]);
    expect(resultado).toEqual({ ok: true, quitadas: 2 });
  });

  it("pagina hasta vaciar la carpeta: 250 archivos se listan en 3 páginas y se borran todos", async () => {
    const archivos = Array.from({ length: 250 }, (_, i) => ({
      id: "f",
      name: `${i}-1.jpg`,
    }));
    const { cliente, list, remove } = fakeStorage({ archivos });

    const resultado = await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO);

    expect(list.mock.calls.map((llamada) => llamada[1].offset)).toEqual([0, 100, 200]);
    expect(remove).toHaveBeenCalledTimes(1);
    const borrados = remove.mock.calls[0]?.[0] as string[];
    expect(borrados).toHaveLength(250);
    expect(borrados[249]).toBe(`${CLIENTE}/${TRABAJO}/249-1.jpg`);
    expect(resultado).toEqual({ ok: true, quitadas: 250 });
  });

  it("si la carpeta no se vacía dentro del tope de páginas, devuelve ok: false y no borra nada", async () => {
    const llenaSiempre = vi.fn(async () => ({
      data: Array.from({ length: TAMANO_PAGINA_LISTADO }, (_, i) => ({
        id: "f",
        name: `${i}.jpg`,
      })),
      error: null,
    }));
    const remove = vi.fn(async (_rutas: string[]) => ({ error: null }));
    const cliente = {
      storage: { from: () => ({ list: llenaSiempre, remove }) },
    } as unknown as SupabaseClient<Database>;

    expect(await quitarFotosDelTrabajo(cliente, CLIENTE, TRABAJO)).toEqual({
      ok: false,
      quitadas: 0,
    });
    expect(remove).not.toHaveBeenCalled();
    expect(llenaSiempre).toHaveBeenCalledTimes(100);
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
