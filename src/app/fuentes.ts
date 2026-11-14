import { Baloo_2, Nunito_Sans } from "next/font/google";

/**
 * Títulos y marca: Baloo 2 (700 y 800). Se usa 800; el 700 queda disponible para etiquetas fuertes.
 * Reemplaza a Archivo (LAB-68).
 */
export const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-baloo",
});

/**
 * Texto, etiquetas y datos: Nunito Sans (400 y 700). Reemplaza a Atkinson Hyperlegible Next y a
 * IBM Plex Mono (LAB-68).
 */
export const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-nunito",
});

export const clasesFuentes = `${baloo.variable} ${nunito.variable}`;
