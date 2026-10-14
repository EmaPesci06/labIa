"use client";

import { useSearchParams } from "next/navigation";

import { TarjetaTrabajo } from "@/components/TarjetaTrabajo";
import { Vacio } from "@/components/ui/Vacio";
import type { TrabajoParaMi } from "@/lib/trabajos/consulta";

import { DetalleTrabajoEscritorio } from "./DetalleTrabajoEscritorio";

type MaestroDetalleTrabajosProps = {
  trabajos: TrabajoParaMi[];
  trabajoSeleccionadoId?: string | null;
};

/**
 * Contenedor maestro-detalle para la lista de trabajos del profesional (LAB-27).
 * - En celular: lista vertical de tarjetas que enlazan a /trabajos/[id].
 * - En escritorio: columna izquierda de 420 px y columna derecha con el detalle.
 */
export function MaestroDetalleTrabajos({
  trabajos,
  trabajoSeleccionadoId,
}: MaestroDetalleTrabajosProps) {
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Columna de tarjetas (móvil y escritorio) */}
      <section
        aria-label="Lista de trabajos disponibles"
        className="flex w-full flex-col gap-3 lg:w-[420px] lg:shrink-0"
      >
        {trabajos.map((t) => {
          const seleccionado = t.id === trabajoActivo?.id;

          return (
            <div key={t.id} className="relative">
              {/* Enlace en celular lleva a /trabajos/[id] */}
              <div className="lg:hidden">
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
                />
              </div>

              {/* Enlace en escritorio actualiza ?trabajo=[id] sin perder el scroll */}
              <div className="hidden lg:block">
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
                  href={urlParaSeleccionar(t.id)}
                  className={
                    seleccionado ? "shadow-sm ring-2 ring-naranja-accion transition-all" : undefined
                  }
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Columna derecha de detalle (solo visible en escritorio lg+) */}
      <div className="hidden min-w-0 flex-1 lg:sticky lg:top-6 lg:block">
        <DetalleTrabajoEscritorio trabajo={trabajoActivo} />
      </div>
    </div>
  );
}
