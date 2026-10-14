import Link from "next/link";

import { CintaDistancia } from "@/components/ui/cinta-metrica";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { haceCuanto } from "@/lib/formato";
import type { Oficio } from "@/lib/busqueda";
import {
  ETIQUETA_OFICIO,
  ETIQUETA_URGENCIA,
  type UrgenciaTrabajo,
} from "@/lib/validaciones/trabajo";

export type TarjetaTrabajoProps = {
  oficio: Oficio;
  barrio: string;
  /** Fecha de publicación; sin fecha (vista previa) se muestra "recién". */
  creadoEn?: Date | string | null;
  titulo: string;
  descripcion: string;
  urgencia: UrgenciaTrabajo;
  postulantes: number;
  /** Distancia al profesional que mira; solo si hay un profesional mirando. */
  distanciaKm?: number | null;
  /** Si viene, la tarjeta entera es un enlace. */
  href?: string;
  className?: string;
};

export function textoPostulantes(n: number): string {
  if (n <= 0) return "Sin postulantes";
  return n === 1 ? "1 postulante" : `${n} postulantes`;
}

/**
 * Tarjeta de un trabajo publicado (lo ven los profesionales y el cliente en "Mis trabajos").
 * Etiqueta mono "GAS · LA PERLA", tiempo relativo, título, descripción a 2 líneas, cinta de
 * distancia, urgencia y cantidad de postulantes.
 */
export function TarjetaTrabajo({
  oficio,
  barrio,
  creadoEn,
  titulo,
  descripcion,
  urgencia,
  postulantes,
  distanciaKm,
  href,
  className,
}: TarjetaTrabajoProps) {
  const cuando = creadoEn ? haceCuanto(creadoEn) : "recién";
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <EtiquetaMono partes={[ETIQUETA_OFICIO[oficio], barrio]} />
        <span className="shrink-0 text-sm text-texto-terciario">{cuando}</span>
      </div>
      <h3 className="mt-2 text-[17px] leading-snug font-bold break-words text-texto">
        {titulo || "Tu título va acá"}
      </h3>
      <p className="mt-1 line-clamp-2 text-[15px] leading-snug break-words text-texto-secundario">
        {descripcion || "Acá se va a ver cómo contás lo que pasa."}
      </p>
      {distanciaKm !== null && distanciaKm !== undefined ? (
        <CintaDistancia km={distanciaKm} className="mt-3" />
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Insignia variante={urgencia === "lo_antes_posible" ? "urgencia" : "verificada"}>
          {ETIQUETA_URGENCIA[urgencia]}
        </Insignia>
        <span className="text-sm font-semibold text-texto-secundario">
          {textoPostulantes(postulantes)}
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Tarjeta borde className={className}>
        <Link href={href} className="block rounded-[14px]">
          {contenido}
        </Link>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta borde className={className}>
      {contenido}
    </Tarjeta>
  );
}
