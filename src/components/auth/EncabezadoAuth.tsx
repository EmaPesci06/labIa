import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  titulo: string;
  bajada?: string;
  /** Texto chico junto a la flecha de volver (compatibilidad con PasoRegistro). */
  contexto?: string;
  /** A dónde lleva la flecha. Por defecto, la bienvenida; `null` oculta el enlace (ej. /ingresar). */
  volverA?: string | null;
  /** Texto del enlace de volver. Por defecto "Volver". */
  volverTexto?: string;
};

/** Cabecera de las pantallas de acceso: enlace de volver, título en Archivo y bajada opcional. */
export function EncabezadoAuth({
  titulo,
  bajada,
  contexto,
  volverA = "/",
  volverTexto = "Volver",
}: Props) {
  return (
    <div className="flex flex-col gap-2.5 pt-2">
      {volverA !== null ? (
        <div className="flex items-center gap-2">
          <Link
            href={volverA}
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-texto"
          >
            <ArrowLeft aria-hidden strokeWidth={3} className="size-5" />
            {volverTexto}
          </Link>
          {contexto ? <span className="text-sm font-bold text-texto">· {contexto}</span> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-[38px] leading-none lg:text-[44px]">{titulo}</h1>
        {bajada ? <p className="text-[17px] leading-[1.4] text-texto">{bajada}</p> : null}
      </div>
    </div>
  );
}
