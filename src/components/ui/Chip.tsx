"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type PropsChip = {
  /** Si el chip está activo (relleno de azul). */
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
 * Chip de filtro seleccionable: píldora de 40 px de alto dentro de un objetivo táctil de 44 px.
 * Inactivo: superficie con borde de 1,5 px. Activo: relleno de azul.
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
      className={cn("group flex min-h-11 items-center rounded-full disabled:opacity-50", className)}
    >
      <span
        className={cn(
          "flex h-10 items-center rounded-full border-[1.5px] px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
          seleccionado
            ? "border-azul bg-azul text-sobre-azul"
            : "border-borde bg-superficie text-texto group-hover:bg-azul-suave",
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
