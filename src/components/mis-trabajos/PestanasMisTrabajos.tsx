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
 * Pestañas de filtrado de "Mis trabajos" del cliente (LAB-29).
 * Permite cambiar entre trabajos abiertos, contratados y terminados.
 */
export function PestanasMisTrabajos({ tabActiva }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Filtro de mis trabajos"
      className="flex flex-wrap items-center gap-2"
    >
      {TABS.map((tab) => {
        const activa = tabActiva === tab.clave;
        return (
          <Link
            key={tab.clave}
            role="tab"
            aria-selected={activa}
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
