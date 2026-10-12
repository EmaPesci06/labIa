import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  titulo: string;
  bajada?: string;
  /** Texto chico junto a la flecha de volver ("Quiero contratar"). */
  contexto?: string;
  /** A dónde lleva la flecha. Por defecto, la bienvenida. */
  volverA?: string;
};

/** Cabecera de las pantallas de acceso: flecha de volver, título y bajada (como el registro del prototipo). */
export function EncabezadoAuth({ titulo, bajada, contexto, volverA = "/" }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href={volverA}
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-campo text-texto"
        >
          <ChevronLeft aria-hidden strokeWidth={2} className="size-[22px]" />
        </Link>
        {contexto ? (
          <span className="text-sm font-semibold text-texto-secundario">{contexto}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-titulo text-[30px] leading-tight lg:text-4xl">{titulo}</h1>
        {bajada ? <p className="text-[15px] text-texto-secundario">{bajada}</p> : null}
      </div>
    </div>
  );
}
