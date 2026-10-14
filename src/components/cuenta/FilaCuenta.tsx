import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const FILA =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-semibold text-texto hover:bg-azul-suave";

/** Grupo de filas de ajustes: tarjeta con divisores y un título pequeño arriba. */
export function GrupoCuenta({
  titulo,
  children,
  peligro = false,
}: {
  titulo?: string;
  children: ReactNode;
  peligro?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      {titulo ? (
        <h2 className="px-1 font-mono text-sm font-medium tracking-[0.4px] text-texto-secundario uppercase">
          {titulo}
        </h2>
      ) : null}
      <ul
        className={cn(
          "divide-y divide-divisor overflow-hidden rounded-[18px] border bg-superficie",
          peligro ? "border-error/40" : "border-divisor",
        )}
      >
        {children}
      </ul>
    </section>
  );
}

/** Fila de 56 px con chevron que lleva a otra pantalla. */
export function FilaEnlace({
  href,
  icono,
  children,
  detalle,
  peligro = false,
  descarga = false,
}: {
  href: string;
  icono?: ReactNode;
  children: ReactNode;
  detalle?: string;
  peligro?: boolean;
  /** Descarga de archivo: un `<a>` común, no un `Link` de Next. */
  descarga?: boolean;
}) {
  const contenido = (
    <>
      {icono}
      <span className="flex-1">{children}</span>
      {detalle ? (
        <span className="text-sm font-normal text-texto-secundario">{detalle}</span>
      ) : null}
      <ChevronRight aria-hidden strokeWidth={2} className="size-5 shrink-0 text-texto-terciario" />
    </>
  );
  const clases = cn(FILA, peligro && "text-error");
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

/** Fila sin enlace (por ejemplo, el selector de tema o un texto de ayuda). */
export function FilaLibre({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("px-4 py-3.5", className)}>{children}</li>;
}
