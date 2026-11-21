import { cn } from "@/lib/cn";

export type ColorToldo = "accion" | "destacado" | "texto" | "adorno";
export type AltoToldo = 14 | 18 | 22 | 26;

// Las variables se fijan con clases arbitrarias (sin style=): la utilidad `toldo` de globals.css
// las lee. Los colores son tokens, nunca hex.
const COLORES: Record<ColorToldo, string> = {
  accion: "[--toldo-color:var(--color-accion)]",
  destacado: "[--toldo-color:var(--color-destacado)]",
  texto: "[--toldo-color:var(--color-texto)]",
  adorno: "[--toldo-color:var(--color-adorno)]",
};

const ALTOS: Record<AltoToldo, string> = {
  14: "[--toldo-alto:14px]",
  18: "[--toldo-alto:18px]",
  22: "[--toldo-alto:22px]",
  26: "[--toldo-alto:26px]",
};

type Props = {
  /** Color de las franjas. Se alterna con `superficie`. Es adorno: nunca lleva texto encima. */
  color?: ColorToldo;
  /** Alto de la franja en px; el ancho de cada raya es igual al alto. */
  alto?: AltoToldo;
  className?: string;
};

/**
 * Toldo: franja rayada de adorno, arriba de tarjetas de oficio, avisos y postulaciones. Es decorativo
 * (`aria-hidden`); el estado lo dice el texto de al lado, nunca el color solo.
 *
 * @example
 * <Toldo color="destacado" alto={14} />
 */
export function Toldo({ color = "accion", alto = 14, className }: Props) {
  return <div aria-hidden className={cn("toldo w-full", COLORES[color], ALTOS[alto], className)} />;
}
