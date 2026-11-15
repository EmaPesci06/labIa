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
 * Etiqueta de datos (distancia, estado, tiempo): Nunito Sans 700, 13 px, mayúsculas, `letter-spacing`
 * .4 px. Reemplaza a la antigua etiqueta en IBM Plex Mono.
 *
 * @example
 * <EtiquetaMono partes={["Gas", "La Perla", "hace 20 min", "a 0,8 km"]} />
 */
export function EtiquetaMono({ como: Elemento = "p", partes, children, className }: Props) {
  return (
    <Elemento
      className={cn("text-[13px] font-bold tracking-[0.4px] text-texto uppercase", className)}
    >
      {partes ? partes.join(" · ") : children}
    </Elemento>
  );
}
