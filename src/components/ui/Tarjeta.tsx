import type { ComponentProps, ElementType } from "react";

import { Card } from "@/components/shadcn/card";
import { cn } from "@/lib/cn";

type Elemento = "div" | "section" | "article" | "li" | "aside";

type Props = Omit<ComponentProps<"div">, "className" | "ref"> & {
  /** Elemento HTML que envuelve la tarjeta. Por defecto no agrega ninguno (la tarjeta es un `div`). */
  como?: Elemento;
  /** Agrega un borde de 2 px color texto (sin borde por defecto, como en el prototipo). */
  borde?: boolean;
  className?: string;
};

/**
 * Tarjeta: capa fina sobre el `Card` de shadcn. Superficie blanca, radio de shadcn, padding 16,
 * sin sombra. Los hijos se apilan como en un `div` común (sin el `flex-col` con aire de `Card`);
 * si hace falta, `className` agrega `flex flex-col gap-3`. Con `como` distinto de `div` envuelve la
 * tarjeta en ese elemento (por ejemplo `article` o `section` con `aria-labelledby`): ahí `className`
 * va a la `Card` de adentro y el resto de las props al envoltorio, así que una clase de ubicación en
 * una grilla (`col-span-*`) no llega al envoltorio. Sin el anillo `ring-1` de `Card` (el prototipo es
 * sin borde).
 */
export function Tarjeta({ como = "div", borde = false, className, children, ...resto }: Props) {
  const clases = cn(
    "block gap-0 overflow-visible p-4 text-base ring-0",
    borde && "border-2 border-foreground",
    className,
  );
  if (como === "div") {
    return (
      <Card {...resto} className={clases}>
        {children}
      </Card>
    );
  }
  const Envoltorio = como as ElementType;
  return (
    <Envoltorio {...resto}>
      <Card className={clases}>{children}</Card>
    </Envoltorio>
  );
}
