import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Elemento HTML a dibujar. Por defecto `div`. */
  como?: ElementType;
  /** Agrega un borde (`border-divisor`) además de la superficie. */
  borde?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * Tarjeta: superficie con radio 18 y padding 16 (como en las tarjetas del prototipo).
 * Con `borde` suma un borde fino. Para tarjetas clickeables usá `como="a"` o envolvela en un `Link`.
 */
export function Tarjeta({ como: Elemento = "div", borde = false, children, className }: Props) {
  return (
    <Elemento
      className={cn(
        "rounded-[18px] bg-superficie p-4 text-texto",
        borde && "border border-divisor",
        className,
      )}
    >
      {children}
    </Elemento>
  );
}
