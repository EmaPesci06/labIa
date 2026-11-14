/**
 * Colores del manifest y de <meta name="theme-color">. Son los tokens `fondo` (claro y oscuro) y
 * `encabezado` de globals.css, escritos como rgb() porque en el código no se admiten hex (los tokens
 * son la única fuente); pwa.test.ts verifica que coincidan con globals.css.
 */
export const PWA_COLORES = {
  fondoClaro: "rgb(255 243 214)",
  fondoOscuro: "rgb(11 39 48)",
  /** Barra del sistema al abrir la app instalada: el encabezado turquesa de cada pantalla. */
  encabezado: "rgb(14 124 134)",
} as const;
