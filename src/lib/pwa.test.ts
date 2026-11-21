import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

import { hexDe, rgbDe } from "./tokens-css";
import { PWA_COLORES } from "./pwa";

describe("colores de la PWA", () => {
  it("coinciden con los tokens de globals.css", () => {
    expect(PWA_COLORES.fondoClaro).toBe(rgbDe(hexDe("claro", "fondo")));
    expect(PWA_COLORES.fondoOscuro).toBe(rgbDe(hexDe("oscuro", "fondo")));
    expect(PWA_COLORES.encabezado).toBe(rgbDe(hexDe("claro", "encabezado")));
    expect(PWA_COLORES.encabezadoOscuro).toBe(rgbDe(hexDe("oscuro", "encabezado")));
  });
});

describe("manifest", () => {
  const m = manifest();

  it("es la app Oficio Seguro, instalable y en español", () => {
    expect(m).toMatchObject({
      name: "Oficio Seguro",
      short_name: "Oficio Seguro",
      lang: "es-AR",
      start_url: "/inicio",
      display: "standalone",
    });
  });

  it("usa los colores de los tokens", () => {
    expect(m.background_color).toBe(PWA_COLORES.fondoClaro);
    expect(m.theme_color).toBe(PWA_COLORES.encabezado);
  });

  it("tiene íconos de 192 y 512 px y uno maskable", () => {
    const iconos = m.icons ?? [];
    expect(iconos.some((i) => i.sizes === "192x192")).toBe(true);
    expect(iconos.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(iconos.some((i) => i.purpose === "maskable")).toBe(true);
  });
});
