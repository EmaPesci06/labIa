import Link from "next/link";

import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Sello } from "@/components/ui/Sello";
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

/**
 * Pastilla de estado del cupón: verde abierto, tinta contratado, rojo anulado. Cada estado tiene un
 * texto propio: el color solo no lo dice.
 */
const ESTILO_ESTADO: Record<Estado, { texto: string; pastilla: string }> = {
  abierto: { texto: "Abierto", pastilla: "bg-exito text-fondo" },
  asignado: { texto: "Contratado", pastilla: "bg-destacado text-sobre-destacado" },
  cerrado: { texto: "Terminado", pastilla: "border-2 border-borde bg-fondo text-texto" },
  cancelado: { texto: "Cancelado", pastilla: "bg-error text-fondo" },
};

/**
 * Cupón de un trabajo del cliente: cabecera con oficio, barrio y hora en etiqueta, borde punteado
 * de talonario y cuerpo con el título y el estado. Un trabajo contratado lleva el sello.
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
        "group relative flex flex-col overflow-hidden rounded-[22px] border-2 border-borde bg-superficie text-texto transition-shadow focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
        seleccionado && "ring-[3px] ring-accion",
      )}
    >
      <EtiquetaMono
        como="span"
        partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre, cuando]}
        className={cn("px-4 pt-3 pb-2.5 lg:px-[18px]", trabajo.estado === "asignado" && "pr-16")}
      />
      <span aria-hidden className="corte-cupon" />
      {trabajo.estado === "asignado" ? (
        <Sello className="absolute top-1.5 right-2 size-12" />
      ) : null}
      <span className="flex flex-col gap-1 p-4 pt-3 lg:p-[18px]">
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
