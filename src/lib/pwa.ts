/**
 * Colores del manifest y de <meta name="theme-color">. Son los tokens `fondo` (claro y oscuro) y
 * `encabezado` de globals.css, escritos como rgb() porque en el código no se admiten hex (los tokens
 * son la única fuente); pwa.test.ts verifica que coincidan con globals.css.
 */
export const PWA_COLORES = {
  fondoClaro: "rgb(234 240 238)",
  fondoOscuro: "rgb(15 26 23)",
  /** Barra del sistema al abrir la app instalada: el encabezado tinta de cada pantalla (claro). */
  encabezado: "rgb(22 35 31)",
  /** Lo mismo en modo oscuro: el token `encabezado` oscuro. */
  encabezadoOscuro: "rgb(26 41 37)",
} as const;
