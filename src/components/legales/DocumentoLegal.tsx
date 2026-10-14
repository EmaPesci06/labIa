import Link from "next/link";
import type { ReactNode } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { FECHA_LEGALES, legalesRevisados, VERSION_LEGALES } from "@/lib/legales";

export interface SeccionLegal {
  id: string;
  titulo: string;
  contenido: ReactNode;
}

/** Valor pendiente de completar por Emanuel (`[RAZÓN SOCIAL]`…): resaltado para no pasarlo por alto. */
export function Marcador({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-sm bg-naranja-suave px-1 font-mono text-[0.92em] text-sobre-naranja-suave">
      {children}
    </mark>
  );
}

/**
 * Estructura común de /terminos y /privacidad: aviso de borrador, índice, secciones numeradas y
 * pie con versión y fecha. Mientras `NEXT_PUBLIC_LEGALES_REVISADOS` no sea "true" avisa que un
 * abogado todavía no revisó el texto.
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
    <article className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-titulo text-[30px] leading-tight lg:text-[36px]">{titulo}</h1>
        <p className="text-[15px] leading-snug text-texto-secundario">{introduccion}</p>
      </header>

      {revisado ? null : (
        <Aviso>
          <strong>Versión borrador.</strong> Este texto todavía no fue revisado por un abogado y
          puede cambiar antes del lanzamiento.
        </Aviso>
      )}

      <nav aria-label="Índice" className="rounded-tarjeta bg-superficie p-4">
        <h2 className="mb-2 font-mono text-xs font-semibold tracking-wider text-texto-terciario uppercase">
          Índice
        </h2>
        <ol className="flex flex-col text-[15px]">
          {secciones.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-11 items-center gap-2.5 rounded-campo font-semibold text-azul underline-offset-2 hover:underline"
              >
                <span className="w-6 font-mono text-[13px] text-texto-terciario">{i + 1}.</span>
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-7">
        {secciones.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="scroll-mt-4">
            <h2 id={`${s.id}-titulo`} className="mb-2 font-titulo text-[22px] leading-tight">
              {i + 1}. {s.titulo}
            </h2>
            <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed [&_a]:font-semibold [&_a]:text-azul [&_a]:underline [&_a]:underline-offset-2 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
              {s.contenido}
            </div>
          </section>
        ))}
      </div>

      <footer className="flex flex-col gap-1 border-t border-divisor pt-4 text-[13px] leading-snug text-texto-terciario">
        <p data-testid="version-legal">
          Versión {VERSION_LEGALES}
          {revisado ? "" : " (borrador)"} · Última actualización: {FECHA_LEGALES}
        </p>
        <Link
          href={otroDocumento.href}
          className="inline-block py-2 font-semibold text-azul underline"
        >
          {otroDocumento.etiqueta}
        </Link>
      </footer>
    </article>
  );
}
