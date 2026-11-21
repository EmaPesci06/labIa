import Link from "next/link";

import { urlBusqueda } from "@/lib/busqueda-url";
import { nombreOficio, OFICIOS_ORDENADOS, type Oficio } from "@/lib/oficios";

type Props = {
  /** Slug del barrio en uso. */
  barrio: string;
  /** Verificados por oficio cerca del barrio; `null` si no se pudo consultar (no se muestra el número). */
  conteos: Partial<Record<Oficio, number>> | null;
};

/**
 * "¿Ya sabés a quién buscás?": un casillero por oficio, con el número de verificados cerca. En celular
 * es una grilla de 2 columnas con "Publicar un trabajo" al final; en escritorio, una fila de 7.
 */
export function GrillaOficios({ barrio, conteos }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:gap-3">
      {OFICIOS_ORDENADOS.map((oficio) => {
        const n = conteos?.[oficio];
        return (
          <li key={oficio} className="flex">
            <Link
              href={urlBusqueda({ oficio, barrio })}
              className="flex h-[72px] w-full items-center justify-between gap-2 rounded-[18px] border-2 border-borde bg-superficie px-3.5 text-texto no-underline hover:border-texto lg:h-[124px] lg:flex-col lg:items-start lg:justify-end lg:rounded-[22px] lg:px-4 lg:pb-3"
            >
              <span className="font-titulo text-xl leading-tight font-extrabold lg:text-[22px]">
                {nombreOficio(oficio)}
              </span>
              {n === undefined ? null : (
                <span className="font-etiqueta text-[15px] tabular-nums">
                  {n}
                  <span className="hidden lg:inline"> cerca</span>
                </span>
              )}
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
