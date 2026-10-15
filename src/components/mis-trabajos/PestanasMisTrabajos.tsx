import Link from "next/link";

import { cn } from "@/lib/cn";

export type TabMisTrabajos = "abiertos" | "contratados" | "terminados";

const TABS: Array<{ clave: TabMisTrabajos; etiqueta: string }> = [
  { clave: "abiertos", etiqueta: "Abiertos" },
  { clave: "contratados", etiqueta: "Contratados" },
  { clave: "terminados", etiqueta: "Terminados" },
];

type Props = {
  tabActiva: TabMisTrabajos;
};

/**
 * Filtro de "Mis trabajos" del cliente (LAB-29, LAB-48).
 * Cada opción es un enlace a `?tab=` (la lista se filtra en el servidor), así que usa el patrón de
 * navegación: links con `aria-current="page"` en la activa. No usa roles de pestaña (tablist/tab/
 * tabpanel), porque esas pestañas piden flechas y paneles que acá no existen.
 */
export function PestanasMisTrabajos({ tabActiva }: Props) {
  return (
    <nav aria-label="Filtro de mis trabajos" className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => {
        const activa = tabActiva === tab.clave;
        return (
          <Link
            key={tab.clave}
            aria-current={activa ? "page" : undefined}
            href={`/mis-trabajos?tab=${tab.clave}`}
            className={cn(
              "rounded-chip inline-flex min-h-[44px] items-center justify-center px-4 text-sm font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
              activa
                ? "bg-azul text-sobre-azul dark:bg-azul-suave dark:text-sobre-azul-suave"
                : "border border-borde bg-superficie text-texto hover:border-azul dark:border-borde dark:bg-superficie dark:hover:border-azul-suave",
            )}
          >
            {tab.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
