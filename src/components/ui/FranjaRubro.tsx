import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Oficio o rubro de la credencial, por ejemplo "Gasista". Se lee como texto normal. */
  children: ReactNode;
  className?: string;
};

/**
 * Franja de rubro de una credencial: tinta de encabezado con la trama de seguridad (líneas
 * onduladas finas) detrás de la etiqueta del oficio. Es el único lugar donde va la trama.
 *
 * @example
 * <FranjaRubro>Gasista</FranjaRubro>
 */
export function FranjaRubro({ children, className }: Props) {
  return (
    <div
      className={cn(
        "trama bg-encabezado px-3.5 py-1.5 font-etiqueta text-[13px] text-sobre-encabezado lg:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
