"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";

import { Toggle } from "@/components/shadcn/toggle";
import { cn } from "@/lib/cn";

import { SIN_ANILLO_BOTON } from "./foco";

// Pastilla de 46 px (objetivo táctil de 44 px mínimo), radio completo, texto 16 en negrita.
const CHIP = `h-[46px] min-h-11 rounded-full px-4 text-base font-bold transition-colors ${SIN_ANILLO_BOTON}`;

// Elegido: destacado con su texto. Sin elegir: superficie. Dentro de un encabezado de color
// (`data-encabezado`, salvo "plano") destacado y superficie pueden confundirse con el bloque, así
// que el elegido pasa a acción y el que no está elegido a fondo; el hover no los pisa.
function estadoChip(seleccionado: boolean) {
  return seleccionado
    ? "bg-secondary text-secondary-foreground aria-pressed:bg-secondary hover:bg-secondary " +
        "hover:text-secondary-foreground en-encabezado:bg-accion en-encabezado:text-sobre-accion " +
        "en-encabezado:hover:bg-accion en-encabezado:hover:text-sobre-accion en-encabezado:aria-pressed:bg-accion"
    : "bg-card text-card-foreground hover:bg-secondary/40 hover:text-card-foreground " +
        "en-encabezado:bg-fondo en-encabezado:text-texto en-encabezado:hover:bg-fondo en-encabezado:hover:text-texto";
}

type PropsChip = {
  /** Si el chip está elegido (destacado; azul noche dentro de un encabezado destacado). */
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
 * Chip de filtro: capa fina sobre el `Toggle` de shadcn, pastilla de 46 px de alto (objetivo táctil de
 * 44 px mínimo).
 * Sin elegir: superficie. Elegido: destacado con su texto.
 *
 * Dentro de un `<Encabezado variante="destacado">` (ese encabezado marca `data-encabezado="destacado"`), el chip
 * elegido pasa a acción y el no elegido a fondo (variante `en-encabezado` de globals.css), sin prop extra.
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
    <Toggle
      pressed={seleccionado}
      onPressedChange={() => onClick?.()}
      role={radio ? "radio" : undefined}
      // `Toggle` pone `aria-pressed`; en modo radio se quita porque ese rol usa `aria-checked`.
      aria-pressed={radio ? undefined : seleccionado}
      aria-checked={radio ? seleccionado : undefined}
      disabled={disabled}
      tabIndex={tabIndex}
      className={cn(CHIP, estadoChip(seleccionado), className)}
    >
      {children}
    </Toggle>
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
 * Grupo de chips. `tipo="multiple"` es un `group` de `Chip` con `aria-pressed`; `tipo="unica"` es un
 * `radiogroup` (flechas del teclado para moverse y elegir) con `Chip` en modo radio. No se usa
 * `ToggleGroup` de shadcn: su foco itinerante (una sola parada con Tab) cambiaría el teclado de las
 * pantallas, y no tiene el rol `radio` de la selección única.
 */
export function GrupoChips(props: GrupoChipsProps) {
  const { opciones, etiqueta, className } = props;
  const idGrupo = useId();

  if (props.tipo === "multiple") {
    const { valor, onChange } = props;
    return (
      <div
        role="group"
        aria-label={etiqueta}
        className={cn("flex flex-wrap gap-x-2 gap-y-1", className)}
      >
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
      className={cn("flex flex-wrap gap-x-2 gap-y-1", className)}
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
