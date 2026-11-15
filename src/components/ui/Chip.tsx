"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type PropsChip = {
  /** Si el chip está elegido (sol; azul noche dentro de un encabezado sol). */
  seleccionado: boolean;
  onClick?: () => void;
  /**
   * "alternar" (por defecto): botón con `aria-pressed`, para selección múltiple o filtros.
   * "radio": `role="radio"` con `aria-checked`, para selección única (lo usa `GrupoChips`).
   */
  modo?: "alternar" | "radio";
  disabled?: boolean;
  tabIndex?: number;
  children: ReactNode;
  className?: string;
};

/**
 * Chip de filtro: pastilla de 46 px de alto dentro de un objetivo táctil de 44 px mínimo.
 * Sin elegir: superficie blanca. Elegido: sol con texto azul noche.
 *
 * Dentro de un `<Encabezado variante="sol">` (ese encabezado marca `data-encabezado="sol"`), el chip
 * elegido pasa a azul noche (token sobre-sol) con texto blanco en los dos modos: sobre sol el amarillo no
 * se distingue. Se resuelve con la variante `in-data-*` de Tailwind, sin prop extra.
 */
export function Chip({
  seleccionado,
  onClick,
  modo = "alternar",
  disabled,
  tabIndex,
  children,
  className,
}: PropsChip) {
  const radio = modo === "radio";
  return (
    <button
      type="button"
      role={radio ? "radio" : undefined}
      aria-pressed={radio ? undefined : seleccionado}
      aria-checked={radio ? seleccionado : undefined}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cn(
        "group inline-flex min-h-11 items-center rounded-full disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-[46px] items-center rounded-full px-4 text-base font-bold whitespace-nowrap transition-colors",
          seleccionado
            ? "bg-sol text-sobre-sol in-data-[encabezado=sol]:bg-sobre-sol in-data-[encabezado=sol]:text-sobre-encabezado"
            : "bg-superficie text-texto group-hover:bg-sol/40",
        )}
      >
        {children}
      </span>
    </button>
  );
}

export type OpcionChip = { valor: string; etiqueta: string };

type PropsGrupoUnica = {
  tipo: "unica";
  valor: string | null;
  onChange: (valor: string) => void;
};
type PropsGrupoMultiple = {
  tipo: "multiple";
  valor: string[];
  onChange: (valor: string[]) => void;
};

export type GrupoChipsProps = (PropsGrupoUnica | PropsGrupoMultiple) & {
  opciones: OpcionChip[];
  /** Nombre accesible del grupo (por ejemplo "Filtros" u "Oficio"). */
  etiqueta: string;
  className?: string;
};

/**
 * Grupo de chips. `tipo="unica"` es un `radiogroup` (flechas del teclado para moverse y elegir);
 * `tipo="multiple"` es un `group` de botones con `aria-pressed`.
 */
export function GrupoChips(props: GrupoChipsProps) {
  const { opciones, etiqueta, className } = props;
  const idGrupo = useId();

  if (props.tipo === "multiple") {
    const { valor, onChange } = props;
    return (
      <div role="group" aria-label={etiqueta} className={cn("flex flex-wrap gap-x-2", className)}>
        {opciones.map((opcion) => {
          const activo = valor.includes(opcion.valor);
          return (
            <Chip
              key={opcion.valor}
              seleccionado={activo}
              onClick={() =>
                onChange(
                  activo ? valor.filter((v) => v !== opcion.valor) : [...valor, opcion.valor],
                )
              }
            >
              {opcion.etiqueta}
            </Chip>
          );
        })}
      </div>
    );
  }

  const { valor, onChange } = props;
  const indiceActivo = Math.max(
    0,
    opciones.findIndex((o) => o.valor === valor),
  );

  function mover(evento: KeyboardEvent<HTMLDivElement>) {
    const delta =
      evento.key === "ArrowRight" || evento.key === "ArrowDown"
        ? 1
        : evento.key === "ArrowLeft" || evento.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    evento.preventDefault();
    const siguiente = opciones[(indiceActivo + delta + opciones.length) % opciones.length];
    if (!siguiente) return;
    onChange(siguiente.valor);
    const botones = evento.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    botones[opciones.indexOf(siguiente)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      id={idGrupo}
      onKeyDown={mover}
      className={cn("flex flex-wrap gap-x-2", className)}
    >
      {opciones.map((opcion, i) => (
        <Chip
          key={opcion.valor}
          modo="radio"
          seleccionado={opcion.valor === valor}
          tabIndex={i === indiceActivo ? 0 : -1}
          onClick={() => onChange(opcion.valor)}
        >
          {opcion.etiqueta}
        </Chip>
      ))}
    </div>
  );
}
