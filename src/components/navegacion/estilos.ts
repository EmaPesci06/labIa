/**
 * Clases de las piezas de la barra superior de escritorio y de la barra de visitante. Son tokens
 * y medidas del boceto `App-Escritorio`: píldoras de 44 px de alto con radio completo.
 */

/** Fila de la barra: 64 px de alto; su contenido se alinea con la columna de 1200 px del marco. */
export const FILA_BARRA =
  "mx-auto flex min-h-16 w-full max-w-[1240px] items-center gap-3 px-5 py-2.5 lg:max-w-[1264px] lg:gap-6 lg:px-8";

/** Sección del centro de la barra: píldora de 44 px; la actual se pinta con `fondo`. */
export const SECCION_BARRA =
  "inline-flex min-h-11 items-center rounded-full px-4 text-base text-texto";

/** Botón de la barra (principal o secundario), más bajo que el `Boton` de las pantallas. */
export const BOTON_BARRA = "min-h-11 rounded-full px-5 text-[15px]";
