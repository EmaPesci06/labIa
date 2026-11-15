import Link from "next/link";

import { nombreCorto } from "@/components/TarjetaProfesional";
import { Distancia } from "@/components/ui/Distancia";
import type { ResultadoProfesional } from "@/lib/busqueda";
import { urlBusqueda } from "@/lib/busqueda-url";
import type { Oficio } from "@/lib/oficios";
import { pluralOficio } from "@/lib/oficios";
import { TITULO_RESULTADO } from "@/lib/problemas";

/** Cuántos profesionales se muestran junto al problema elegido (el boceto muestra 3). */
const MUESTRA = 3;

type Props = {
  oficio: Oficio;
  /** Slug del barrio en uso (para el enlace a la búsqueda). */
  barrio: string;
  /** Los primeros profesionales del oficio cerca del barrio, ya ordenados por cercanía. */
  profesionales: ResultadoProfesional[];
  /** Cuántos verificados hay en total; `null` si no se pudo consultar. */
  total: number | null;
};

/**
 * "Eso lo arregla una plomera": el oficio del problema elegido, con los más cercanos y el enlace a
 * la búsqueda completa. Sin WhatsApp ni teléfonos: el contacto va en el perfil (LAB-72).
 */
export function ResultadoProblema({ oficio, barrio, profesionales, total }: Props) {
  const muestra = profesionales.slice(0, MUESTRA);
  const plural = pluralOficio(oficio).toLowerCase();
  const hayMas = total !== null && total > 0;

  return (
    <section
      aria-labelledby="resultado-problema"
      aria-live="polite"
      className="flex flex-col gap-2 rounded-[28px] bg-fondo p-5 text-texto lg:p-6"
    >
      <h2
        id="resultado-problema"
        className="font-titulo text-[26px] leading-[1.1] font-extrabold lg:text-[28px]"
      >
        {TITULO_RESULTADO[oficio]}
      </h2>

      {muestra.length === 0 ? (
        <p className="text-base">Todavía no hay {plural} verificados cerca de tu barrio.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {muestra.map((profesional) => (
            <li key={profesional.usuarioId}>
              <Link
                href={`/profesionales/${profesional.usuarioId}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-[18px] bg-superficie px-4 text-[17px] font-bold text-texto no-underline hover:bg-superficie hover:text-texto"
              >
                <span>{nombreCorto(profesional.nombre, profesional.apellidoInicial)}</span>
                <Distancia km={profesional.distanciaKm} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hayMas ? (
        <Link
          href={urlBusqueda({ oficio, barrio })}
          className="mt-1 flex min-h-11 items-center justify-center self-center text-base font-bold text-texto underline decoration-2 underline-offset-4"
        >
          {total === 1 ? "Ver a ese profesional" : `Ver a los ${total} ${plural}`}
        </Link>
      ) : null}
    </section>
  );
}
