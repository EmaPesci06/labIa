import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Elemento HTML a dibujar. Por defecto `div`. */
  como?: ElementType;
  /** Agrega un borde de 2 px color texto (sin borde por defecto, como en el prototipo). */
  borde?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * Tarjeta: superficie blanca, radio 22, padding 16, sin sombra. Para tarjetas clickeables usá
 * `como="a"` o envolvela en un `Link`.
 */
export function Tarjeta({ como: Elemento = "div", borde = false, children, className }: Props) {
  return (
    <Elemento
      className={cn(
        "rounded-tarjeta bg-superficie p-4 text-texto",
        borde && "border-2 border-texto",
        className,
      )}
    >
      {children}
    </Elemento>
  );
}
