import type { MetadataRoute } from "next";

import { PWA_COLORES } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/inicio",
    name: "LabÍA",
    short_name: "LabÍA",
    description: "Oficios de confianza en Mar del Plata.",
    lang: "es-AR",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    background_color: PWA_COLORES.fondoClaro,
    theme_color: PWA_COLORES.azul,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
