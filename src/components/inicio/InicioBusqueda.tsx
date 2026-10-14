"use client";

import {
  ChevronDown,
  Cog,
  Droplets,
  Flame,
  Hammer,
  KeyRound,
  MapPin,
  PaintRoller,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Barrio } from "@/lib/barrios-busqueda";
import { urlBusqueda } from "@/lib/busqueda-url";
import { nombreOficio, OFICIOS_ORDENADOS, type Oficio } from "@/lib/oficios";

const ICONOS: Record<Oficio, LucideIcon> = {
  gas: Flame,
  electricidad: Zap,
  plomeria: Droplets,
  cerrajeria: KeyRound,
  carpinteria: Hammer,
  pintura: PaintRoller,
  mecanica: Cog,
};

type Props = {
  barrios: Barrio[];
  /** Slug del barrio con el que arranca (el de la cuenta, o el Centro). */
  barrioInicial: string;
};

/**
 * Selector de barrio y grilla de los 7 oficios del inicio. Cambiar el barrio vale solo para esta
 * búsqueda (no toca la cuenta): cada tarjeta lleva a `/buscar?oficio=<oficio>&barrio=<slug>`.
 */
export function InicioBusqueda({ barrios, barrioInicial }: Props) {
  const [barrio, setBarrio] = useState(barrioInicial);

  return (
    <>
      <label className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] border border-borde bg-superficie px-3.5 text-texto">
        <MapPin aria-hidden strokeWidth={2} className="size-5 shrink-0 text-texto-secundario" />
        <span className="shrink-0 text-sm text-texto-secundario">Tu barrio</span>
        <select
          value={barrio}
          onChange={(evento) => setBarrio(evento.target.value)}
          disabled={barrios.length === 0}
          className="min-h-[50px] min-w-0 flex-1 appearance-none bg-transparent text-right text-base font-semibold text-azul"
        >
          {barrios.length === 0 ? <option value={barrio}>Centro</option> : null}
          {barrios.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.nombre}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden strokeWidth={2} className="size-4 shrink-0 text-azul" />
      </label>

      <ul className="grid grid-cols-2 gap-2.5">
        {OFICIOS_ORDENADOS.map((oficio) => {
          const Icono = ICONOS[oficio];
          return (
            <li key={oficio} className="flex">
              <Link
                href={urlBusqueda({ oficio, barrio })}
                className="flex min-h-14 w-full items-center gap-2.5 rounded-[14px] bg-superficie px-4 text-[15px] font-bold text-texto no-underline hover:bg-azul-suave hover:text-texto"
              >
                <Icono aria-hidden strokeWidth={2} className="size-5 shrink-0 text-azul" />
                {nombreOficio(oficio)}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
