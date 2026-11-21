import Link from "next/link";

import { Toldo, type ColorToldo } from "@/components/ui/Toldo";
import { urlBusqueda } from "@/lib/busqueda-url";
import { cn } from "@/lib/cn";
import { nombreOficio, OFICIOS_ORDENADOS, type Oficio } from "@/lib/oficios";

/**
 * Colores de cada carpa, como en el boceto: turquesa, destacado, azul noche y superficie con toldo adorno.
 * Todos son tokens; el texto sobre cada fondo sale del par de la tabla de tokens.
 */
const CARPA: Record<Oficio, { fondo: string; texto: string; toldo: ColorToldo }> = {
  plomeria: { fondo: "bg-accion", texto: "text-sobre-accion", toldo: "accion" },
  electricidad: { fondo: "bg-destacado", texto: "text-sobre-destacado", toldo: "destacado" },
  gas: { fondo: "bg-texto", texto: "text-superficie", toldo: "texto" },
  cerrajeria: { fondo: "bg-superficie", texto: "text-texto", toldo: "adorno" },
  pintura: { fondo: "bg-destacado", texto: "text-sobre-destacado", toldo: "destacado" },
  carpinteria: { fondo: "bg-accion", texto: "text-sobre-accion", toldo: "accion" },
  mecanica: { fondo: "bg-superficie", texto: "text-texto", toldo: "adorno" },
};

type Props = {
  /** Slug del barrio en uso. */
  barrio: string;
  /** Verificados por oficio cerca del barrio; `null` si no se pudo consultar (no se muestra el número). */
  conteos: Partial<Record<Oficio, number>> | null;
};

/**
 * "¿Ya sabés a quién buscás?": una carpa por oficio, con el número de verificados cerca. En celular
 * es una grilla de 2 columnas con "Publicar un trabajo" al final; en escritorio, una fila de 7.
 */
export function GrillaOficios({ barrio, conteos }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:gap-3">
      {OFICIOS_ORDENADOS.map((oficio) => {
        const estilo = CARPA[oficio];
        const n = conteos?.[oficio];
        return (
          <li key={oficio} className="flex">
            <Link
              href={urlBusqueda({ oficio, barrio })}
              className={cn(
                "flex h-[72px] w-full flex-col overflow-hidden rounded-[18px] no-underline hover:opacity-95 lg:h-[124px] lg:rounded-[22px]",
                estilo.fondo,
                estilo.texto,
              )}
            >
              <Toldo color={estilo.toldo} alto={14} />
              <span className="flex flex-1 items-center justify-between gap-2 px-3.5 lg:flex-col lg:items-start lg:justify-end lg:px-4 lg:pb-3">
                <span className="font-titulo text-xl leading-tight font-extrabold lg:text-[22px]">
                  {nombreOficio(oficio)}
                </span>
                {n === undefined ? null : (
                  <span className="text-[15px] font-bold tabular-nums">
                    {n}
                    <span className="hidden lg:inline"> cerca</span>
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
      <li className="flex lg:hidden">
        <Link
          href="/trabajos/nuevo"
          className="flex h-[72px] w-full items-center justify-center rounded-[18px] border-[3px] border-dashed border-texto px-2.5 text-center text-base leading-tight font-bold text-texto no-underline"
        >
          Publicar un trabajo
        </Link>
      </li>
    </ul>
  );
}
