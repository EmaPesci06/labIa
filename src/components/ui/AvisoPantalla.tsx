import { ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Toldo } from "./Toldo";

type Props = {
  /** Ícono en círculo sol. Por defecto un escudo. */
  icono?: LucideIcon;
  /** Título de la pantalla. Por defecto `h1`; dentro de otra página con su propio `h1`, usá 2. */
  titulo: string;
  nivel?: 1 | 2;
  /** Texto corto explicando qué pasó y qué sigue. */
  texto?: string;
  /** Acción principal, normalmente un `<Boton>`. */
  accion?: ReactNode;
  className?: string;
};

/**
 * Pantalla de aviso completa (molde de `App-Aviso`): ícono, título, texto y un botón, con un toldo
 * de adorno abajo. Para casos como sin conexión, cuenta eliminada o enlace vencido.
 *
 * @example
 * <AvisoPantalla titulo="Te quedaste sin conexión" texto="Revisá tu internet y volvé a intentar." accion={<Boton>Reintentar</Boton>} />
 */
export function AvisoPantalla({
  icono: Icono = ShieldCheck,
  titulo,
  nivel = 1,
  texto,
  accion,
  className,
}: Props) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <section
      className={cn(
        "flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 pt-10 pb-0 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-24 items-center justify-center rounded-full bg-sol text-sobre-sol"
      >
        <Icono strokeWidth={2.5} className="size-12" />
      </span>
      <Titulo className="font-titulo text-[38px] leading-none text-texto">{titulo}</Titulo>
      {texto ? <p className="max-w-sm text-lg text-texto">{texto}</p> : null}
      {accion ? <div className="w-full max-w-sm">{accion}</div> : null}
      <Toldo color="accion" alto={14} className="mt-auto" />
    </section>
  );
}
