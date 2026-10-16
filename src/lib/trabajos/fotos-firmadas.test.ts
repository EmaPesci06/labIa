import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import {
  BUCKET_FOTOS_TRABAJOS,
  SEGUNDOS_URL_FOTO_TRABAJO,
  firmarFotosTrabajo,
} from "./fotos-firmadas";

vi.mock("server-only", () => ({}));

const RUTA_A = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/0-1.jpg";
const RUTA_B = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/1-2.jpg";

/** Cliente falso: registra la llamada y devuelve las firmas que se le pidan. */
function fakeSupabase(respuesta: {
  data?: { error: string | null; path: string | null; signedUrl: string }[] | null;
  error?: { message: string } | null;
}) {
  const createSignedUrls = vi.fn(async () => ({
    data: respuesta.data ?? null,
    error: respuesta.error ?? null,
  }));
  const from = vi.fn(() => ({ createSignedUrls }));
  const cliente = { storage: { from } } as unknown as SupabaseClient<Database>;
  return { cliente, from, createSignedUrls };
}

describe("firmarFotosTrabajo", () => {
  it("firma en el bucket privado con la vida corta y devuelve las URL firmadas", async () => {
    const { cliente, from, createSignedUrls } = fakeSupabase({
      data: [
        { error: null, path: RUTA_A, signedUrl: "https://x/a?token=1" },
        { error: null, path: RUTA_B, signedUrl: "https://x/b?token=2" },
      ],
    });

    const urls = await firmarFotosTrabajo(cliente, [RUTA_A, RUTA_B]);

    expect(from).toHaveBeenCalledWith(BUCKET_FOTOS_TRABAJOS);
    expect(createSignedUrls).toHaveBeenCalledWith([RUTA_A, RUTA_B], SEGUNDOS_URL_FOTO_TRABAJO);
    expect(urls).toEqual(["https://x/a?token=1", "https://x/b?token=2"]);
  });

  it("omite las rutas que no se pudieron firmar", async () => {
    const { cliente } = fakeSupabase({
      data: [
        { error: "Object not found", path: RUTA_A, signedUrl: "" },
        { error: null, path: RUTA_B, signedUrl: "https://x/b?token=2" },
      ],
    });

    expect(await firmarFotosTrabajo(cliente, [RUTA_A, RUTA_B])).toEqual(["https://x/b?token=2"]);
  });

  it("sin rutas no llama a Storage", async () => {
    const { cliente, createSignedUrls } = fakeSupabase({ data: [] });

    expect(await firmarFotosTrabajo(cliente, [])).toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it("si Storage falla, no devuelve URL y no rompe la página", async () => {
    const { cliente } = fakeSupabase({ error: { message: "boom" } });

    expect(await firmarFotosTrabajo(cliente, [RUTA_A])).toEqual([]);
  });

  it("la vida de la URL es de 10 minutos", () => {
    expect(SEGUNDOS_URL_FOTO_TRABAJO).toBe(600);
  });
});
