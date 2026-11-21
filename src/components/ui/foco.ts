/**
 * Un solo foco (LAB-86). globals.css dibuja el outline de 3 px del token `foco` en todo
 * `[data-slot]:focus-visible`; shadcn suma encima su anillo (`ring-3 ring-ring/50`) y cambia el borde
 * a `ring`. Las capas finas apagan ese anillo con estas clases para que no haya dos indicadores.
 */
export const SIN_ANILLO = "focus-visible:ring-0 aria-invalid:ring-0 dark:aria-invalid:ring-0";

/** Igual que SIN_ANILLO y el borde queda transparente al enfocar (botones). */
export const SIN_ANILLO_BOTON = `${SIN_ANILLO} focus-visible:border-transparent`;
