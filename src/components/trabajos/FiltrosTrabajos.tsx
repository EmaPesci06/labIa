"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ui/Chip";
import type { Oficio } from "@/lib/busqueda";
import { ETIQUETA_OFICIO } from "@/lib/validaciones/trabajo";

type FiltrosTrabajosProps = {
  oficios: Oficio[];
  oficioSeleccionado: Oficio | null;
  soloMisZonas: boolean;
};

/**
 * Chips de filtro para la lista de trabajos del profesional (LAB-27):
 * - "Todos mis oficios" / cada oficio propio
 * - "Solo mis zonas" (activo por defecto)
 */
export function FiltrosTrabajos({
  oficios,
  oficioSeleccionado,
  soloMisZonas,
}: FiltrosTrabajosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function actualizarFiltros(nuevoOficio: string | null, nuevoSoloZonas: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (nuevoOficio) {
      params.set("oficio", nuevoOficio);
    } else {
      params.delete("oficio");
    }

    if (!nuevoSoloZonas) {
      params.set("zonas", "todas");
    } else {
      params.delete("zonas");
    }

    // Al filtrar, quitamos la selección de trabajo en escritorio para resetear el detalle
    params.delete("trabajo");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      role="region"
      aria-label="Filtros de trabajos"
      className="flex flex-wrap items-center gap-2"
    >
      <div role="group" aria-label="Oficios" className="flex flex-wrap gap-2">
        <Chip
          seleccionado={oficioSeleccionado === null}
          onClick={() => actualizarFiltros(null, soloMisZonas)}
        >
          Todos mis oficios
        </Chip>
        {oficios.map((oficio) => (
          <Chip
            key={oficio}
            seleccionado={oficioSeleccionado === oficio}
            onClick={() => actualizarFiltros(oficio, soloMisZonas)}
          >
            {ETIQUETA_OFICIO[oficio] ?? oficio}
          </Chip>
        ))}
      </div>

      <div className="h-6 w-px bg-divisor" aria-hidden="true" />

      <Chip
        seleccionado={soloMisZonas}
        onClick={() => actualizarFiltros(oficioSeleccionado, !soloMisZonas)}
      >
        Solo mis zonas
      </Chip>
    </div>
  );
}
