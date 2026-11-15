import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Grupo de filas de ajustes en una tarjeta blanca con divisores de color fondo. */
export function GrupoCuenta({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <nav aria-label={etiqueta} className="rounded-[20px] bg-superficie px-4">
      <ul className="divide-y-2 divide-fondo">{children}</ul>
    </nav>
  );
}

/** Fila que lleva a otra pantalla o descarga un archivo. */
export function FilaEnlace({
  href,
  children,
  conFlecha = true,
  compacta = false,
  peligro = false,
  descarga = false,
}: {
  href: string;
  children: ReactNode;
  conFlecha?: boolean;
  compacta?: boolean;
  peligro?: boolean;
  /** Descarga de archivo: un `<a>` común, no un `Link` de Next. */
  descarga?: boolean;
}) {
  const contenido = (
    <>
      <span>{children}</span>
      {conFlecha ? <span aria-hidden="true">›</span> : null}
    </>
  );
  const clases = cn(
    "flex w-full items-center justify-between text-left text-texto",
    compacta ? "min-h-12 text-base" : "min-h-[54px] text-[17px] font-bold",
    peligro && "text-error",
  );
  return (
    <li>
      {descarga ? (
        <a href={href} download className={clases}>
          {contenido}
        </a>
      ) : (
        <Link href={href} className={clases}>
          {contenido}
        </Link>
      )}
    </li>
  );
}

/** Fila sin enlace dentro de un grupo. */
export function FilaLibre({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("py-3.5", className)}>{children}</li>;
}
