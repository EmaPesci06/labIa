"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { Bloque } from "@/components/navegacion/Esqueleto";
import { Chip } from "@/components/ui/Chip";
import { Combobox } from "@/components/ui/Combobox";
import { Encabezado } from "@/components/ui/Encabezado";
import type { Barrio } from "@/lib/barrios-busqueda";
import type { Oficio, OrdenBusqueda } from "@/lib/busqueda";
import { urlBusqueda, type EstadoBusqueda } from "@/lib/busqueda-url";
import { esMatriculable, nombreOficio, OFICIOS_ORDENADOS } from "@/lib/oficios";

import { SelectorPastilla, type OpcionPastilla } from "./SelectorPastilla";

type Props = {
  oficio: Oficio | undefined;
  barrio: string;
  barrios: Barrio[];
  matriculados: boolean;
  orden: OrdenBusqueda;
  todaLaCiudad: boolean;
  /** Título de la pantalla ("Plomería cerca de La Perla"). */
  titulo: string;
  /** Línea de resultados ("8 verificados, del más cercano al más lejano"). */
  descripcion?: string;
  /** Columna lateral de escritorio (Server Component). */
  aside: ReactNode;
  /** Resultados, avisos y "Ver más" (Server Components). */
  children: ReactNode;
};

/** Esqueleto de la lista de resultados mientras se actualizan los filtros. */
export function EsqueletoResultados() {
  return (
    <div aria-hidden className="flex flex-col gap-2.5 lg:gap-3">
      {[0, 1, 2, 3].map((n) => (
        <Bloque key={n} className="h-24 rounded-[22px] lg:h-[120px]" />
      ))}
    </div>
  );
}

const OPCIONES_OFICIO: OpcionPastilla[] = [
  { valor: "", etiqueta: "Todos los oficios" },
  ...OFICIOS_ORDENADOS.map((o) => ({ valor: o, etiqueta: nombreOficio(o) })),
];

const OPCIONES_DISTANCIA: OpcionPastilla[] = [
  { valor: "cerca", etiqueta: "Cerca de tu barrio" },
  { valor: "ciudad", etiqueta: "Toda la ciudad" },
];

/**
 * Encabezado de la búsqueda (turquesa, con volver al inicio), filtros y la lista. La URL es el estado:
 * cada filtro hace `router.replace` dentro de una transición, así que el botón atrás funciona, la
 * página no se recarga entera y mientras llegan los resultados nuevos se muestran esqueletos.
 *
 * Filtros: oficio, barrio y distancia (`Cerca de tu barrio` / `Toda la ciudad`) como pastillas; y
 * los chips de matriculados (solo gas y electricidad) y mejor calificados.
 */
export function PanelBusqueda({
  oficio,
  barrio,
  barrios,
  matriculados,
  orden,
  todaLaCiudad,
  titulo,
  descripcion,
  aside,
  children,
}: Props) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  const estado: EstadoBusqueda = { oficio, barrio, matriculados, orden, todaLaCiudad };

  function aplicar(cambios: Partial<EstadoBusqueda>) {
    // Cualquier filtro nuevo vuelve a la primera página.
    const destino = urlBusqueda({ ...estado, ...cambios, pagina: 1 });
    empezar(() => router.replace(destino, { scroll: false }));
  }

  const opcionesBarrio: OpcionPastilla[] =
    barrios.length > 0
      ? barrios.map((b) => ({ valor: b.slug, etiqueta: b.nombre }))
      : [{ valor: barrio, etiqueta: barrio }];

  return (
    <>
      <Encabezado
        titulo={titulo}
        volver={{ href: "/inicio", etiqueta: "Volver al inicio" }}
        className="gap-4 lg:gap-5"
      >
        <div className="flex flex-wrap gap-2.5">
          <SelectorPastilla
            etiqueta="Oficio"
            valor={oficio ?? ""}
            opciones={OPCIONES_OFICIO}
            onCambio={(valor) => {
              const elegido = OFICIOS_ORDENADOS.find((o) => o === valor);
              aplicar({ oficio: elegido });
            }}
          />
          <Combobox
            aspecto="pastilla"
            etiqueta="Tu barrio"
            value={barrio}
            opciones={opcionesBarrio}
            disabled={barrios.length === 0}
            placeholderBusqueda="Buscá tu barrio…"
            sinResultados="No encontramos ese barrio."
            onValueChange={(slug) => aplicar({ barrio: slug })}
          />
          <SelectorPastilla
            etiqueta="Distancia"
            valor={todaLaCiudad ? "ciudad" : "cerca"}
            opciones={OPCIONES_DISTANCIA}
            onCambio={(valor) => aplicar({ todaLaCiudad: valor === "ciudad" })}
          />
        </div>
        <div
          role="group"
          aria-label="Filtros de confianza y orden"
          className="flex flex-wrap gap-x-2 gap-y-2"
        >
          {esMatriculable(oficio) || matriculados ? (
            <Chip
              seleccionado={matriculados}
              onClick={() => aplicar({ matriculados: !matriculados })}
            >
              Solo matriculados
            </Chip>
          ) : null}
          <Chip
            seleccionado={orden === "calificacion"}
            onClick={() =>
              aplicar({ orden: orden === "calificacion" ? "cercania" : "calificacion" })
            }
          >
            Mejor calificados
          </Chip>
        </div>
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-4">
          {descripcion ? (
            <p role="status" className="text-[15px] lg:text-base">
              {pendiente ? "Actualizando resultados…" : descripcion}
            </p>
          ) : (
            <p role="status" className="sr-only">
              {pendiente ? "Actualizando resultados…" : ""}
            </p>
          )}
          <div aria-busy={pendiente} className="flex flex-col gap-3.5 lg:gap-4">
            {pendiente ? <EsqueletoResultados /> : children}
          </div>
        </div>
        <div className="hidden flex-col gap-4 lg:sticky lg:top-6 lg:flex">{aside}</div>
      </div>
    </>
  );
}
