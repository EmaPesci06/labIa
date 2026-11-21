import { SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/shadcn/empty";
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

/**
 * Estado vacío: capa fina sobre el `Empty` de shadcn. Ícono en círculo destacado, título (encabezado de
 * nivel 2), descripción opcional y una acción.
 */
export function Vacio({ icono: Icono = SearchX, titulo, descripcion, accion, className }: Props) {
  return (
    <Empty className={cn("flex-none gap-3 px-4 py-10", className)}>
      <EmptyHeader className="gap-3">
        <EmptyMedia
          variant="icon"
          aria-hidden
          className="mb-0 size-16 rounded-full bg-secondary text-secondary-foreground"
        >
          <Icono strokeWidth={2.5} className="size-8" />
        </EmptyMedia>
        <EmptyTitle
          role="heading"
          aria-level={2}
          className="font-titulo text-[26px] leading-tight font-extrabold tracking-normal text-foreground"
        >
          {titulo}
        </EmptyTitle>
        {descripcion ? (
          <EmptyDescription className="max-w-xs text-base/normal text-foreground">
            {descripcion}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {accion ? <EmptyContent className="mt-2">{accion}</EmptyContent> : null}
    </Empty>
  );
}
