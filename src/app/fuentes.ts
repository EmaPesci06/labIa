import { Archivo, Archivo_Narrow } from "next/font/google";

/**
 * Títulos, marca y texto: Archivo (LAB-90). Se usa 800 en títulos y 400, 500 y 600 en el texto (el 500 es el `font-medium` de shadcn y del admin)
 * (`font-bold` queda mapeado a 600 en globals.css, así que el 700 no hace falta).
 * Reemplaza a Baloo 2 y a Nunito Sans (LAB-94).
 */
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-archivo",
});

/** Etiquetas, números de cupón y marcas: Archivo Narrow 700, en mayúsculas (clase `font-etiqueta`). */
export const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  adjustFontFallback: true,
  variable: "--fuente-archivo-narrow",
});

export const clasesFuentes = `${archivo.variable} ${archivoNarrow.variable}`;
