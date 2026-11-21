import Link from "next/link";

import { cn } from "@/lib/cn";
import { PROBLEMAS } from "@/lib/problemas";

type Props = {
  /** Slug del problema elegido (el que muestra el resultado). */
  problemaActual: string;
  /** Slug del barrio en uso, para que no se pierda al elegir un problema. */
  barrio: string;
};

/**
 * Chips de "¿Qué se rompió?". Son enlaces (`/inicio?problema=…`), no botones: el resultado vive en la
 * URL, así que recargar o volver conserva la elección. El problema elegido va con `aria-current`.
 * "Es otra cosa" lleva a publicar el trabajo.
 */
export function ProblemasFrecuentes({ problemaActual, barrio }: Props) {
  return (
    <div role="group" aria-label="Problemas frecuentes" className="flex flex-wrap gap-2.5">
      {PROBLEMAS.map((problema) => {
        const activo = problema.slug === problemaActual;
        const query = new URLSearchParams({ problema: problema.slug, barrio });
        return (
          <Link
            key={problema.slug}
            href={`/inicio?${query.toString()}`}
            scroll={false}
            aria-current={activo ? "true" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center rounded-full px-4 text-base no-underline",
              activo
                ? "bg-destacado font-bold text-sobre-destacado hover:bg-destacado"
                : "bg-superficie text-texto hover:bg-superficie hover:text-texto",
              problema.soloEscritorio && "hidden lg:inline-flex",
            )}
          >
            {problema.etiqueta}
          </Link>
        );
      })}
      <Link
        href="/trabajos/nuevo"
        className="inline-flex min-h-12 items-center rounded-full border-2 border-sobre-encabezado px-4 text-base font-bold text-sobre-encabezado no-underline hover:text-sobre-encabezado"
      >
        Es otra cosa
      </Link>
    </div>
  );
}
