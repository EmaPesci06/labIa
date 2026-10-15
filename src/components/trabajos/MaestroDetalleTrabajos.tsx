"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";

import { TarjetaTrabajo } from "@/components/TarjetaTrabajo";
import { Vacio } from "@/components/ui/Vacio";
import type { TrabajoParaMi } from "@/lib/trabajos/consulta";

import { DetalleTrabajoEscritorio } from "./DetalleTrabajoEscritorio";
import type { MiPostulacionInfo } from "./FormularioPostulacion";

type MaestroDetalleTrabajosProps = {
  trabajos: TrabajoParaMi[];
  trabajoSeleccionadoId?: string | null;
  /** Postulación propia del trabajo seleccionado (la carga la página); `null` si no hay. */
  miPostulacionSeleccionada?: MiPostulacionInfo | null;
  publicado?: boolean;
};

const MEDIA_ESCRITORIO = "(min-width: 1024px)";

/**
 * Contenedor maestro-detalle para la lista de trabajos del profesional (LAB-27 y LAB-28).
 * Una sola tarjeta por trabajo en el DOM:
 * - Celular: tocar la tarjeta va a /trabajos/[id].
 * - Escritorio (lg+): tocar la tarjeta selecciona el trabajo con ?trabajo=[id] y muestra el detalle
 *   a la derecha. El clic se intercepta en captura para que el enlace no navegue.
 */
export function MaestroDetalleTrabajos({
  trabajos,
  trabajoSeleccionadoId,
  miPostulacionSeleccionada = null,
  publicado = true,
}: MaestroDetalleTrabajosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (trabajos.length === 0) {
    return (
      <Vacio
        titulo="No hay trabajos nuevos de tus oficios por ahora."
        descripcion="Te avisamos por email cuando aparezca uno cerca."
      />
    );
  }

  const trabajoActivo = trabajos.find((t) => t.id === trabajoSeleccionadoId) ?? null;

  function urlParaSeleccionar(id: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("trabajo", id);
    return `/trabajos?${params.toString()}`;
  }

  function seleccionarEnEscritorio(evento: MouseEvent<HTMLLIElement>, id: string) {
    if (!window.matchMedia(MEDIA_ESCRITORIO).matches) return;
    // Ctrl/Cmd/Shift/Alt o botón distinto del principal: dejamos que el navegador abra el enlace
    // (pestaña nueva, ventana nueva o clic medio).
    const modificado = evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey;
    if (modificado || evento.button !== 0) return;
    evento.preventDefault();
    router.push(urlParaSeleccionar(id), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <ul
        aria-label="Lista de trabajos disponibles"
        className="flex w-full flex-col gap-3 lg:w-[420px] lg:shrink-0"
      >
        {trabajos.map((t) => {
          const seleccionado = t.id === trabajoActivo?.id;

          return (
            <li
              key={t.id}
              aria-current={seleccionado ? "true" : undefined}
              onClickCapture={(evento) => seleccionarEnEscritorio(evento, t.id)}
            >
              <TarjetaTrabajo
                oficio={t.oficio}
                barrio={t.barrioNombre}
                creadoEn={t.createdAt}
                titulo={t.titulo}
                descripcion={t.descripcion}
                urgencia={t.urgencia}
                postulantes={t.cantidadPostulaciones}
                distanciaKm={t.distanciaKm}
                yaMePostule={t.yaMePostule}
                href={`/trabajos/${t.id}`}
                className={
                  seleccionado ? "shadow-sm ring-2 ring-naranja-accion transition-all" : undefined
                }
              />
            </li>
          );
        })}
      </ul>

      {/* Columna derecha de detalle (solo visible en escritorio lg+) */}
      <div className="hidden min-w-0 flex-1 lg:sticky lg:top-6 lg:block">
        <DetalleTrabajoEscritorio
          trabajo={trabajoActivo}
          miPostulacion={miPostulacionSeleccionada}
          publicado={publicado}
        />
      </div>
    </div>
  );
}
