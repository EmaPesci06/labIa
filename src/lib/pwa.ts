/**
 * Colores del manifest y de <meta name="theme-color">. Son los tokens `fondo` (claro y oscuro) y
 * `azul` de globals.css, escritos como rgb() porque en el código no se admiten hex (los tokens
 * son la única fuente); pwa.test.ts verifica que coincidan con globals.css.
 */
export const PWA_COLORES = {
  fondoClaro: "rgb(241 243 246)",
  fondoOscuro: "rgb(18 24 38)",
  /** Barra del sistema al abrir la app instalada. */
  azul: "rgb(35 47 73)",
} as const;
