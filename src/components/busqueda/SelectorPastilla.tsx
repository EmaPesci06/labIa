"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/cn";

export type OpcionPastilla = { valor: string; etiqueta: string };

type Props = {
  /** Nombre accesible del selector (queda en el `label`). */
  etiqueta: string;
  valor: string;
  opciones: readonly OpcionPastilla[];
  onCambio: (valor: string) => void;
  /** Texto antes del valor, dentro de la píldora ("Estás en"). */
  prefijo?: string;
  /** Borde de 2 px color texto (barra superior). Sin borde por defecto. */
  borde?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Selector nativo con forma de píldora de 48 px: fondo `superficie`, texto en negrita. Es un
 * `<select>` de verdad (teclado y lector de pantalla sin trabajo extra). El nombre accesible va en
 * el `label`, que también envuelve el prefijo visible.
 */
export function SelectorPastilla({
  etiqueta,
  valor,
  opciones,
  onCambio,
  prefijo,
  borde = false,
  disabled = false,
  className,
}: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full bg-superficie pr-3 pl-4 text-texto",
        borde && "border-2 border-texto",
        disabled && "opacity-60",
        className,
      )}
    >
      {prefijo ? <span className="shrink-0 text-[15px]">{prefijo}</span> : null}
      <select
        id={id}
        aria-label={prefijo ? undefined : etiqueta}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onCambio(evento.target.value)}
        className="h-11 min-w-0 flex-1 appearance-none bg-transparent text-base font-bold text-texto disabled:cursor-not-allowed"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden strokeWidth={2.5} className="size-4 shrink-0" />
    </label>
  );
}
