import Link from "next/link";

import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Toldo, type ColorToldo } from "@/components/ui/Toldo";
import { cn } from "@/lib/cn";
import { haceCuanto } from "@/lib/formato";
import type { TrabajoClienteItem } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

type Props = {
  trabajo: TrabajoClienteItem;
  seleccionado?: boolean;
  href: string;
};

type Estado = TrabajoClienteItem["estado"];

/** Color del toldo y pastilla de estado. Cada estado tiene un texto propio: el color solo no lo dice. */
const ESTILO_ESTADO: Record<Estado, { texto: string; toldo: ColorToldo; pastilla: string }> = {
  abierto: { texto: "Abierto", toldo: "accion", pastilla: "bg-sol text-sobre-sol" },
  asignado: { texto: "Contratado", toldo: "sol", pastilla: "bg-sol text-sobre-sol" },
  cerrado: { texto: "Terminado", toldo: "texto", pastilla: "bg-fondo text-texto" },
  cancelado: { texto: "Cancelado", toldo: "texto", pastilla: "bg-fondo text-texto" },
};

/**
 * Tarjeta de un trabajo del cliente (boceto App-MisTrabajos). Toldo arriba, oficio y barrio en
 * etiqueta, título en Baloo 2 y la cantidad de postulantes o el estado en una pastilla.
 */
export function TarjetaMiTrabajo({ trabajo, seleccionado = false, href }: Props) {
  const estilo = ESTILO_ESTADO[trabajo.estado];
  const cuando = haceCuanto(trabajo.createdAt);
  const textoPostulantes =
    trabajo.cantidadPostulaciones === 0
      ? "Sin postulantes"
      : trabajo.cantidadPostulaciones === 1
        ? "1 postulante"
        : `${trabajo.cantidadPostulaciones} postulantes`;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[22px] bg-superficie text-texto transition-shadow focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
        seleccionado && "ring-[3px] ring-accion",
      )}
    >
      <Toldo color={estilo.toldo} alto={14} />
      <span className="flex flex-col gap-1 p-4 pt-3 lg:p-[18px]">
        <EtiquetaMono
          como="span"
          partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre, cuando]}
        />
        <span className="font-titulo text-[22px] leading-[1.1] font-extrabold text-texto">
          {trabajo.titulo}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px]">
          <span className={cn("rounded-full px-3 py-1 text-sm font-bold", estilo.pastilla)}>
            {estilo.texto}
          </span>
          <span>
            {ETIQUETA_URGENCIA[trabajo.urgencia]} · {textoPostulantes}
          </span>
        </span>
      </span>
    </Link>
  );
}
