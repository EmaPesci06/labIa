import { SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Ícono de lucide. Por defecto una lupa tachada. */
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  /** Acción sugerida, normalmente un `<Boton>`. */
  accion?: ReactNode;
  className?: string;
};

/** Estado vacío: ícono, título, descripción opcional y una acción. */
export function Vacio({ icono: Icono = SearchX, titulo, descripcion, accion, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-azul-suave text-sobre-azul-suave"
      >
        <Icono strokeWidth={2} className="size-7" />
      </span>
      <h2 className="text-[17px] font-bold text-texto">{titulo}</h2>
      {descripcion ? (
        <p className="max-w-xs text-[15px] text-texto-secundario">{descripcion}</p>
      ) : null}
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  );
}
