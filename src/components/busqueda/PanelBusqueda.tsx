"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Bloque } from "@/components/navegacion/Esqueleto";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import type { Oficio, OrdenBusqueda } from "@/lib/busqueda";
import { urlBusqueda, type EstadoBusqueda } from "@/lib/busqueda-url";
import type { Barrio } from "@/lib/barrios";
import { cn } from "@/lib/cn";
import { esMatriculable, nombreOficio, OFICIOS_ORDENADOS } from "@/lib/oficios";

/** Barrios que se ofrecen como atajo en la columna de filtros de escritorio, si existen. */
const BARRIOS_FRECUENTES = ["centro", "la-perla", "chauvin", "los-troncos"] as const;

type Props = {
  oficio: Oficio | undefined;
  barrio: string;
  barrios: Barrio[];
  matriculados: boolean;
  orden: OrdenBusqueda;
  todaLaCiudad: boolean;
  /** Título y contador (Server Component). */
  encabezado: ReactNode;
  /** Tarjetas de resultados (Server Component). */
  children: ReactNode;
};

/** Esqueleto de la lista de resultados mientras se actualizan los filtros. */
export function EsqueletoResultados() {
  return (
    <div aria-hidden className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
      {[0, 1, 2, 3].map((n) => (
        <Bloque key={n} className="h-[148px] rounded-[18px] lg:h-[172px]" />
      ))}
    </div>
  );
}

function TituloFiltro({ children }: { children: ReactNode }) {
  return <EtiquetaMono className="text-texto-terciario">{children}</EtiquetaMono>;
}

/**
 * Filtros de la búsqueda y marco de la pantalla. La URL es el estado: cada filtro hace
 * `router.replace` dentro de una transición, así que el botón atrás funciona, la página no se
 * recarga entera y mientras llegan los resultados nuevos se muestran esqueletos.
 *
 * Celular: fila de chips bajo el título. Escritorio (≥ 1024 px): columna de 280 px a la izquierda.
 */
export function PanelBusqueda({
  oficio,
  barrio,
  barrios,
  matriculados,
  orden,
  todaLaCiudad,
  encabezado,
  children,
}: Props) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [barrioElegido, setBarrioElegido] = useState(barrio);

  const estado: EstadoBusqueda = { oficio, barrio, matriculados, orden, todaLaCiudad };

  function aplicar(cambios: Partial<EstadoBusqueda>) {
    // Cualquier filtro nuevo vuelve a la primera página.
    const destino = urlBusqueda({ ...estado, ...cambios, pagina: 1 });
    empezar(() => router.replace(destino, { scroll: false }));
  }

  const frecuentes = BARRIOS_FRECUENTES.map((slug) => barrios.find((b) => b.slug === slug)).filter(
    (b): b is Barrio => Boolean(b),
  );

  const chipMatriculados = (
    <Chip seleccionado={matriculados} onClick={() => aplicar({ matriculados: !matriculados })}>
      Solo matriculados
    </Chip>
  );
  const chipCalificados = (
    <Chip
      seleccionado={orden === "calificacion"}
      onClick={() => aplicar({ orden: orden === "calificacion" ? "cercania" : "calificacion" })}
    >
      Mejor calificados
    </Chip>
  );
  const chipCiudad = (
    <Chip seleccionado={todaLaCiudad} onClick={() => aplicar({ todaLaCiudad: !todaLaCiudad })}>
      Toda la ciudad
    </Chip>
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
      <aside
        aria-label="Filtros"
        className="hidden w-[280px] shrink-0 flex-col gap-[22px] rounded-[18px] bg-superficie p-[22px] lg:flex"
      >
        <div className="flex flex-col gap-2">
          <TituloFiltro>Barrio</TituloFiltro>
          <form
            key={barrio}
            className="flex flex-col gap-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              aplicar({ barrio: barrioElegido });
            }}
          >
            <Campo
              variante="seleccion"
              etiqueta="Barrio de referencia"
              value={barrioElegido}
              onChange={(evento) => setBarrioElegido(evento.target.value)}
              disabled={barrios.length === 0}
            >
              {barrios.length === 0 ? <option value={barrio}>{barrio}</option> : null}
              {barrios.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.nombre}
                </option>
              ))}
            </Campo>
            <div className="flex flex-wrap gap-x-2">
              {frecuentes.map((b) => (
                <Chip
                  key={b.slug}
                  seleccionado={b.slug === barrio}
                  onClick={() => {
                    setBarrioElegido(b.slug);
                    aplicar({ barrio: b.slug });
                  }}
                >
                  {b.nombre}
                </Chip>
              ))}
              {chipCiudad}
            </div>
            <Boton type="submit" variante="cliente" bloque>
              Buscar
            </Boton>
          </form>
        </div>

        <div className="flex flex-col gap-1">
          <TituloFiltro>Oficio</TituloFiltro>
          <ul className="flex flex-col">
            {[undefined, ...OFICIOS_ORDENADOS].map((o) => (
              <li key={o ?? "todos"}>
                <button
                  type="button"
                  aria-pressed={oficio === o}
                  onClick={() => aplicar({ oficio: o })}
                  className={cn(
                    "min-h-11 w-full rounded-[10px] px-3 text-left text-[15px] font-semibold",
                    oficio === o ? "bg-azul text-sobre-azul" : "text-texto hover:bg-azul-suave",
                  )}
                >
                  {o ? nombreOficio(o) : "Todos"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <TituloFiltro>Confianza</TituloFiltro>
          <div className="flex flex-wrap gap-x-2">
            {chipMatriculados}
            {chipCalificados}
          </div>
          <p className="text-[13px] leading-snug text-texto-terciario">
            Todos los perfiles tienen identidad y antecedentes verificados.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-[18px]">
        {encabezado}
        <div role="group" aria-label="Filtros" className="flex flex-wrap gap-x-2 lg:hidden">
          {esMatriculable(oficio) || matriculados ? chipMatriculados : null}
          {chipCalificados}
          {chipCiudad}
        </div>
        <p role="status" className="sr-only">
          {pendiente ? "Actualizando resultados…" : ""}
        </p>
        <div aria-busy={pendiente} className="flex flex-col gap-4 lg:gap-[18px]">
          {pendiente ? <EsqueletoResultados /> : children}
        </div>
      </div>
    </div>
  );
}
