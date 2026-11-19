import Link from "next/link";

import type { Oficio } from "@/lib/busqueda";
import { cn } from "@/lib/cn";
import { formatearDistancia, haceCuanto } from "@/lib/formato";
import {
  ETIQUETA_OFICIO,
  ETIQUETA_URGENCIA,
  type UrgenciaTrabajo,
} from "@/lib/validaciones/trabajo";

import { Insignia } from "./ui/Insignia";
import { Tarjeta } from "./ui/Tarjeta";

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
  /** Si el profesional ya se postuló a este trabajo (LAB-27). */
  yaMePostule?: boolean;
  /** Si viene, la tarjeta entera es un enlace. */
  href?: string;
  /** Nivel del título: 3 por defecto; 2 cuando la lista cuelga directo del `h1` de la pantalla. */
  nivelTitulo?: 2 | 3;
  className?: string;
};

export const ETIQUETA_URGENCIA_CORTA: Record<UrgenciaTrabajo, string> = {
  lo_antes_posible: "Para hoy",
  esta_semana: "Esta semana",
  sin_apuro: "Sin apuro",
};

export function textoPostulantes(n: number): string {
  if (n <= 0) return "Sin postulaciones todavía";
  return n === 1 ? "1 postulación" : `${n} postulaciones`;
}

/**
 * Tarjeta de un trabajo publicado (bocetos App-Trabajos y Oscuro-Trabajos, LAB-78).
 * Fila superior con oficio · barrio · tiempo relativo y pastilla de urgencia ("Para hoy" en sol,
 * resto en fondo); título en Baloo 2 800; distancia y cantidad de postulaciones abajo.
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
  yaMePostule,
  href,
  nivelTitulo = 3,
  className,
}: TarjetaTrabajoProps) {
  void descripcion;
  const cuando = creadoEn ? haceCuanto(creadoEn) : "recién";
  const distanciaTexto =
    distanciaKm !== null && distanciaKm !== undefined
      ? formatearDistancia(distanciaKm).replace(/^a /, "A ")
      : null;

  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  const contenido = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2 text-sm text-texto">
        <span>
          {ETIQUETA_OFICIO[oficio]} · {barrio} · {cuando}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            aria-label={ETIQUETA_URGENCIA[urgencia]}
            className={cn(
              "rounded-[12px] px-2.5 py-1 font-bold",
              urgencia === "lo_antes_posible"
                ? "bg-sobre-sol text-sobre-encabezado"
                : "bg-fondo text-texto",
            )}
          >
            {ETIQUETA_URGENCIA_CORTA[urgencia]}
          </span>
          {yaMePostule ? <Insignia variante="verificada">Te postulaste</Insignia> : null}
        </span>
      </span>
      <Titulo className="font-titulo text-[22px] leading-[1.1] break-words text-texto">
        {titulo || "Tu título va acá"}
      </Titulo>
      <span className="text-[15px] text-texto tabular-nums">
        {distanciaTexto ? `${distanciaTexto} · ` : ""}
        {textoPostulantes(postulantes)}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-col gap-1 rounded-tarjeta bg-superficie px-4 py-3.5 text-texto no-underline transition-colors",
          className,
        )}
      >
        {contenido}
      </Link>
    );
  }
  return (
    <Tarjeta className={cn("flex flex-col gap-1 px-4 py-3.5", className)}>{contenido}</Tarjeta>
  );
}
