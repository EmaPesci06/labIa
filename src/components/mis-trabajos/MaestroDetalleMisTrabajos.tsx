import { Plus } from "lucide-react";
import Link from "next/link";

import { Boton } from "@/components/ui/Boton";
import type { DetalleMiTrabajoCliente, TrabajoClienteItem } from "@/lib/trabajos/consulta";

import { DetalleMiTrabajo } from "./DetalleMiTrabajo";
import { PestanasMisTrabajos, type TabMisTrabajos } from "./PestanasMisTrabajos";
import { SeleccionInicialEscritorio } from "./SeleccionInicialEscritorio";
import { TarjetaMiTrabajo } from "./TarjetaMiTrabajo";

type Props = {
  trabajos: TrabajoClienteItem[];
  trabajoSeleccionado: DetalleMiTrabajoCliente | null;
  tabActiva: TabMisTrabajos;
};

/**
 * Vista maestro-detalle de "Mis trabajos" del cliente (LAB-29, LAB-48).
 * - Celular: lista de trabajos con pestañas; tocar uno lleva a `/mis-trabajos/[id]`.
 * - Escritorio (Desk-MisTrabajos): dos columnas, lista a la izquierda (400 px) y detalle con
 *   postulantes a la derecha. Sin `?id=` el detalle no se carga; en escritorio se elige el primero.
 */
export function MaestroDetalleMisTrabajos({ trabajos, trabajoSeleccionado, tabActiva }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 py-2 lg:py-6">
      {!trabajoSeleccionado && trabajos.length > 0 ? (
        <SeleccionInicialEscritorio
          tabActiva={tabActiva}
          primerTrabajoId={trabajos[0]?.id ?? null}
        />
      ) : null}
      {/* Encabezado y Pestañas */}
      <div className="flex flex-col gap-3">
        <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto lg:text-[32px]">
          Mis trabajos
        </h1>
        <PestanasMisTrabajos tabActiva={tabActiva} />
      </div>

      {trabajos.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[22px] border border-dashed border-borde bg-superficie p-8 text-center">
          <p className="text-lg font-bold text-texto">Todavía no publicaste trabajos.</p>
          <p className="max-w-md text-sm text-texto-secundario">
            Publicá lo que necesitás hacer en tu casa para recibir presupuestos de profesionales
            verificados de Mar del Plata.
          </p>
          <Boton href="/trabajos/nuevo" variante="cliente" tamano="grande">
            Publicar un trabajo
          </Boton>
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
          {/* Columna izquierda (Lista) */}
          <section
            aria-label="Lista de mis trabajos"
            className="flex w-full flex-col gap-3 lg:w-[400px] lg:shrink-0"
          >
            {/* Lista visible en móvil y escritorio */}
            <div className="flex flex-col gap-3">
              {trabajos.map((trabajo) => {
                const seleccionado = trabajoSeleccionado?.id === trabajo.id;
                // En escritorio mantenemos ?tab=...&id=..., en móvil vamos a /mis-trabajos/[id]
                return (
                  <div key={trabajo.id}>
                    {/* Móvil: enlace a /mis-trabajos/[id] */}
                    <div className="lg:hidden">
                      <TarjetaMiTrabajo trabajo={trabajo} href={`/mis-trabajos/${trabajo.id}`} />
                    </div>
                    {/* Escritorio: enlace a ?tab=...&id=... */}
                    <div className="hidden lg:block">
                      <TarjetaMiTrabajo
                        trabajo={trabajo}
                        seleccionado={seleccionado}
                        href={`/mis-trabajos?tab=${tabActiva}&id=${trabajo.id}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón "+ Publicar otro trabajo" de escritorio */}
            <Link
              href="/trabajos/nuevo"
              className="hidden min-h-[48px] items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-borde text-[15px] font-bold text-azul transition-colors hover:border-azul hover:bg-azul-suave/20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco lg:flex"
            >
              <Plus aria-hidden className="size-4" />
              Publicar otro trabajo
            </Link>
          </section>

          {/* Columna derecha (Detalle y Postulantes en Escritorio) */}
          <section
            aria-label="Detalle del trabajo seleccionado"
            className="hidden min-w-0 flex-1 flex-col lg:flex"
          >
            {trabajoSeleccionado ? (
              <DetalleMiTrabajo trabajo={trabajoSeleccionado} mostrarTituloCompleto={true} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-[22px] border border-divisor bg-superficie p-8 text-center text-[17px] text-texto-secundario">
                Elegí un trabajo de la lista para ver los postulantes.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
