import Link from "next/link";
import type { ReactNode } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { cn } from "@/lib/cn";
import {
  FECHA_LEGALES,
  legalesRevisados,
  RUTA_PRIVACIDAD,
  RUTA_TERMINOS,
  VERSION_LEGALES,
} from "@/lib/legales";

export interface SeccionLegal {
  id: string;
  titulo: string;
  contenido: ReactNode;
}

/** Valor pendiente de completar por Emanuel (`[RAZÓN SOCIAL]`…): resaltado para no pasarlo por alto. */
export function Marcador({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-sm bg-destacado px-1 font-texto text-[0.92em] text-sobre-destacado">
      {children}
    </mark>
  );
}

const DOCUMENTOS = [
  { href: RUTA_TERMINOS, etiqueta: "Términos" },
  { href: RUTA_PRIVACIDAD, etiqueta: "Privacidad" },
] as const;

/**
 * Estructura común de /terminos y /privacidad (LAB-35, LAB-80: boceto `App-Legal`): selector de
 * documento, aviso de borrador, índice, secciones numeradas y pie con versión y fecha. Mientras
 * `NEXT_PUBLIC_LEGALES_REVISADOS` no sea "true" avisa que un abogado todavía no revisó el texto.
 */
export function DocumentoLegal({
  titulo,
  introduccion,
  secciones,
  otroDocumento,
}: {
  titulo: string;
  introduccion: ReactNode;
  secciones: readonly SeccionLegal[];
  otroDocumento: { href: string; etiqueta: string };
}) {
  const revisado = legalesRevisados();
  return (
    <article className="flex flex-col gap-5 pt-2 lg:relative lg:left-1/2 lg:w-[min(720px,calc(100vw-80px))] lg:-translate-x-1/2">
      <nav aria-label="Documentos legales" className="grid grid-cols-2 gap-2">
        {DOCUMENTOS.map((doc) => {
          const esActual = doc.href !== otroDocumento.href;
          return (
            <Link
              key={doc.href}
              href={doc.href}
              aria-current={esActual ? "page" : undefined}
              className={cn(
                "flex min-h-[46px] items-center justify-center rounded-full text-base transition-colors",
                esActual
                  ? "bg-destacado font-bold text-sobre-destacado"
                  : "bg-superficie text-texto hover:bg-destacado/40",
              )}
            >
              {doc.etiqueta}
            </Link>
          );
        })}
      </nav>

      <header className="flex flex-col gap-1.5 pt-1">
        <h1 className="font-titulo text-[36px] leading-none lg:text-[44px]">{titulo}</h1>
        <p className="text-[15px] leading-snug text-texto">{introduccion}</p>
        <p className="text-sm text-texto">
          Versión {VERSION_LEGALES} · Última actualización: {FECHA_LEGALES}
          {revisado ? "" : " · Borrador pendiente de revisión legal"}
        </p>
      </header>

      {revisado ? null : (
        <Aviso>
          <strong>Versión borrador.</strong> Este texto todavía no fue revisado por un abogado y
          puede cambiar antes del lanzamiento.
        </Aviso>
      )}

      <nav aria-label="Índice" className="rounded-3xl bg-superficie p-4">
        <h2 className="mb-2 font-texto text-xs font-bold tracking-wider text-texto uppercase">
          Índice
        </h2>
        <ol className="flex flex-col text-[15px]">
          {secciones.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-11 items-center gap-2.5 rounded-xl font-bold text-texto underline-offset-2 hover:underline"
              >
                <span className="w-6 font-texto text-[13px] text-texto">{i + 1}.</span>
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-7">
        {secciones.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-4">
            <h2 id={`${s.id}-titulo`} className="mb-2 font-titulo text-[22px] leading-[1.1]">
              {i + 1}. {s.titulo}
            </h2>
            <div className="flex flex-col gap-2.5 text-[17px] leading-[1.55] wrap-break-word [&_a]:font-bold [&_a]:text-texto [&_a]:underline [&_a]:underline-offset-2 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
              {s.contenido}
            </div>
          </section>
        ))}
      </div>

      <footer className="flex flex-col gap-1 border-t border-superficie pt-4 text-sm leading-snug text-texto">
        <p data-testid="version-legal">
          Versión {VERSION_LEGALES}
          {revisado ? "" : " (borrador)"} · Última actualización: {FECHA_LEGALES}
        </p>
        <Link
          href={otroDocumento.href}
          className="inline-flex min-h-11 items-center self-start font-bold text-texto underline underline-offset-2"
        >
          {otroDocumento.etiqueta}
        </Link>
      </footer>
    </article>
  );
}
