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
 * Chips de filtro para la lista de trabajos del profesional (LAB-27, LAB-78):
 * - "Todos" / cada oficio propio (boceto App-Trabajos: role="group" aria-label="Filtrar por oficio")
 * - "Solo mis zonas" (cuando está disponible el filtro por zona)
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
    // y volvemos a la primera página de la lista (LAB-46)
    params.delete("pagina");

    const query = params.toString();
    // replace: cambiar un filtro no agrega una entrada al historial.
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div
      role="region"
      aria-label="Filtros de trabajos"
      className="flex flex-wrap items-center gap-2"
    >
      <div role="group" aria-label="Filtrar por oficio" className="flex flex-wrap gap-2">
        <Chip
          seleccionado={oficioSeleccionado === null}
          onClick={() => actualizarFiltros(null, soloMisZonas)}
        >
          Todos
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

      <Chip
        seleccionado={soloMisZonas}
        onClick={() => actualizarFiltros(oficioSeleccionado, !soloMisZonas)}
      >
        Solo mis zonas
      </Chip>
    </div>
  );
}
