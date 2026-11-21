"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

type Props = {
  /** A dónde ir si la persona llegó directo al perfil (sin pasar por la app). */
  href: string;
  /** Texto del enlace en escritorio, por ejemplo "Volver a gasistas". */
  etiquetaEscritorio: string;
  /** Muestra el texto también en celular (en lugar de solo la flecha). */
  mostrarEtiquetaMovil?: boolean;
  /** Clases extra; el perfil lo usa para el color sobre el encabezado turquesa. */
  className?: string;
};

/**
 * "Volver": en celular una flecha de 44 px, en escritorio "← Volver a gasistas". Si la persona
 * venía de otra pantalla de Oficio Seguro vuelve ahí (conserva los filtros de la búsqueda); si no, va a `href`.
 */
export function EnlaceVolver({
  href,
  etiquetaEscritorio,
  mostrarEtiquetaMovil = false,
  className,
}: Props) {
  const router = useRouter();

  function volver(evento: React.MouseEvent<HTMLAnchorElement>) {
    try {
      const anterior = document.referrer ? new URL(document.referrer) : null;
      if (anterior && anterior.origin === window.location.origin && window.history.length > 1) {
        evento.preventDefault();
        router.back();
      }
    } catch {
      // Si no se puede saber de dónde venía, queda el enlace normal.
    }
  }

  return (
    <Link
      href={href}
      onClick={volver}
      className={cn(
        "-ml-2.5 flex min-h-11 w-fit items-center justify-center gap-1 rounded-xl px-2.5 text-texto lg:ml-0 lg:px-0 lg:text-sm lg:font-semibold lg:text-texto",
        className,
      )}
    >
      <ChevronLeft aria-hidden strokeWidth={2} className="size-[22px] lg:hidden" />
      {mostrarEtiquetaMovil ? (
        <span>{etiquetaEscritorio}</span>
      ) : (
        <span className="sr-only lg:not-sr-only">
          <span aria-hidden className="hidden lg:inline">
            ←{" "}
          </span>
          {etiquetaEscritorio}
        </span>
      )}
    </Link>
  );
}
