import Link from "next/link";

import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { cn } from "@/lib/cn";
import { haceCuanto } from "@/lib/formato";
import type { TrabajoClienteItem } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

type Props = {
  trabajo: TrabajoClienteItem;
  seleccionado?: boolean;
  href: string;
};

function textoYClasesEstado(estado: TrabajoClienteItem["estado"]): {
  texto: string;
  clases: string;
} {
  switch (estado) {
    case "abierto":
      return {
        texto: "Abierto",
        clases: "bg-azul-suave text-sobre-azul-suave",
      };
    case "asignado":
      return {
        texto: "Contratado",
        clases: "bg-exito-suave text-sobre-exito-suave",
      };
    case "cerrado":
      return {
        texto: "Terminado",
        clases: "bg-divisor text-texto-secundario",
      };
    case "cancelado":
      return {
        texto: "Cancelado",
        clases: "bg-divisor text-texto-secundario",
      };
  }
}

/**
 * Tarjeta de un trabajo del cliente (prototipos MisTrabajos y Desk-MisTrabajos).
 */
export function TarjetaMiTrabajo({ trabajo, seleccionado = false, href }: Props) {
  const estadoInfo = textoYClasesEstado(trabajo.estado);
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
        "group flex flex-col gap-2 rounded-[18px] bg-superficie p-4 transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco lg:p-[18px]",
        seleccionado
          ? "border-2 border-azul shadow-sm dark:border-azul-suave"
          : "border border-divisor hover:border-borde",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <EtiquetaMono partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre]} />
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
            estadoInfo.clases,
          )}
        >
          {estadoInfo.texto}
        </span>
      </div>

      <span className="font-titulo text-[17px] font-bold tracking-tight text-texto group-hover:text-azul lg:text-lg">
        {trabajo.titulo}
      </span>

      <span className="text-sm text-texto-secundario">
        {cuando} · {ETIQUETA_URGENCIA[trabajo.urgencia]} · {textoPostulantes}
      </span>
    </Link>
  );
}
