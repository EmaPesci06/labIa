import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Elemento a dibujar. Por defecto `p`. */
  como?: ElementType;
  /** Si se pasan `partes`, se unen con " · " (GAS · LA PERLA · HACE 20 MIN). */
  partes?: readonly string[];
  children?: ReactNode;
  className?: string;
};

/**
 * Etiqueta de datos en IBM Plex Mono 13/600, mayúsculas, `letter-spacing` .4 px.
 *
 * @example
 * <EtiquetaMono partes={["Gas", "La Perla", "hace 20 min", "a 0,8 km"]} />
 */
export function EtiquetaMono({ como: Elemento = "p", partes, children, className }: Props) {
  return (
    <Elemento
      className={cn(
        "font-mono text-[13px] font-semibold tracking-[0.4px] text-texto-secundario uppercase",
        className,
      )}
    >
      {partes ? partes.join(" · ") : children}
    </Elemento>
  );
}
