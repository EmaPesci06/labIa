import { afterEach, describe, expect, it, vi } from "vitest";

import { urlFoto } from "./fotos";

describe("urlFoto", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("arma la URL pública de una ruta válida", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co/");
    expect(urlFoto("abc-123/perfil-1.jpg")).toBe(
      "https://x.supabase.co/storage/v1/object/public/fotos/abc-123/perfil-1.jpg",
    );
  });

  it("rechaza rutas raras o vacías", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    for (const mala of [
      "../x.jpg",
      "a/../b.jpg",
      "a b.jpg",
      "a?x=1.jpg",
      "//evil.com/x.jpg",
      "",
      null,
    ]) {
      expect(urlFoto(mala)).toBeNull();
    }
  });
});
