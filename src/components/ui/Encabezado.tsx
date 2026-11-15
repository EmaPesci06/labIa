import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type VarianteEncabezado = "turquesa" | "equipo" | "sol" | "plano";

const VARIANTES: Record<VarianteEncabezado, string> = {
  turquesa: "bg-encabezado text-sobre-encabezado",
  equipo: "bg-equipo text-sobre-encabezado",
  sol: "bg-sol text-sobre-sol",
  // Sin bloque de color: el título va directo sobre el fondo arena (postulaciones, cuenta).
  plano: "bg-transparent text-texto",
};

type Props = {
  /**
   * "turquesa" (por defecto), "equipo" (panel de admin, azul noche), "sol" (listas con chips, texto
   * azul noche) o "plano" (sin bloque de color). Todas menos "plano" tienen esquinas inferiores
   * redondeadas (28 px; 40 desde `lg`).
   */
  variante?: VarianteEncabezado;
  /** Título de la pantalla. Por defecto `h1`; dentro de otra página con su propio `h1`, usá 2. */
  titulo: string;
  nivel?: 1 | 2;
  /** Texto de apoyo debajo del título. */
  descripcion?: string;
  /** Enlace de volver arriba del título. Sin esta prop no hay enlace. */
  volver?: { href: string; etiqueta?: string };
  /** Contenido opcional dentro del bloque: filtros, chips, pestañas. */
  children?: ReactNode;
  className?: string;
};

/**
 * Encabezado de pantalla: bloque de color con volver (opcional), título y contenido (opcional).
 * Marca `data-encabezado` con la variante: los chips elegidos lo leen para cambiar a azul noche
 * dentro de un encabezado `sol`.
 *
 * @example
 * <Encabezado titulo="Trabajos para vos" variante="sol">…chips…</Encabezado>
 * <Encabezado variante="plano" titulo="Mis postulaciones" />
 */
export function Encabezado({
  variante = "turquesa",
  titulo,
  nivel = 1,
  descripcion,
  volver,
  children,
  className,
}: Props) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <header
      data-encabezado={variante}
      className={cn(
        "flex flex-col gap-3 px-5 pt-3 pb-5 lg:px-8 lg:pt-6 lg:pb-8",
        variante !== "plano" && "rounded-b-[28px] lg:rounded-b-[40px]",
        VARIANTES[variante],
        className,
      )}
    >
      {volver ? (
        <Link
          href={volver.href}
          className="inline-flex min-h-11 items-center gap-1 self-start font-bold underline decoration-2 underline-offset-4"
        >
          <ChevronLeft aria-hidden strokeWidth={2.5} className="size-5" />
          {volver.etiqueta ?? "Volver"}
        </Link>
      ) : null}
      <Titulo className="font-titulo text-[34px] leading-none lg:text-[56px]">{titulo}</Titulo>
      {descripcion ? <p className="text-base">{descripcion}</p> : null}
      {children}
    </header>
  );
}
