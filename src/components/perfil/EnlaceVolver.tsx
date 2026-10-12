"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  /** A dónde ir si la persona llegó directo al perfil (sin pasar por la app). */
  href: string;
  /** Texto del enlace en escritorio, por ejemplo "Volver a gasistas". */
  etiquetaEscritorio: string;
};

/**
 * "Volver": en celular una flecha de 44 px, en escritorio "← Volver a gasistas". Si la persona
 * venía de otra pantalla de LabÍA vuelve ahí (conserva los filtros de la búsqueda); si no, va a `href`.
 */
export function EnlaceVolver({ href, etiquetaEscritorio }: Props) {
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
      aria-label="Volver"
      className="-ml-2.5 flex min-h-11 w-fit items-center justify-center gap-1 rounded-campo px-2.5 text-texto lg:ml-0 lg:px-0 lg:text-sm lg:font-semibold lg:text-azul"
    >
      <ChevronLeft aria-hidden strokeWidth={2} className="size-[22px] lg:hidden" />
      <span aria-hidden className="hidden lg:inline">
        ← {etiquetaEscritorio}
      </span>
    </Link>
  );
}
