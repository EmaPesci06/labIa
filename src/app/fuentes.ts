import { Archivo, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

/** Títulos: Archivo variable con el eje de ancho (wdth) para el font-stretch 118 %. */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-archivo",
});

/**
 * Texto: Atkinson Hyperlegible Next, variable (200 a 800; usamos 400 a 700).
 * Va con next/font/local porque next/font/google no tiene sus métricas y no genera la fuente de
 * reemplazo ajustada (habría salto de diseño al cargar). Archivos latin de Google Fonts, licencia OFL.
 */
export const atkinson = localFont({
  src: [
    {
      path: "./_fuentes/atkinson-hyperlegible-next-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "./_fuentes/atkinson-hyperlegible-next-latin-italic.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
  variable: "--fuente-atkinson",
});

/** Etiquetas, distancias, pasos y datos. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-plex-mono",
});

export const clasesFuentes = `${archivo.variable} ${atkinson.variable} ${plexMono.variable}`;
