"use client";

import { useId, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { SIN_ANILLO } from "@/components/ui/foco";
import { cn } from "@/lib/cn";

export type OpcionPastilla = { valor: string; etiqueta: string };

type Props = {
  /** Nombre accesible del selector. */
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

// Base UI interpreta "" como vacío en algunos flujos; lo mapeamos internamente para no perder
// opciones válidas como "Todos los oficios" (`valor: ""`).
const VALOR_VACIO = "__labia_vacio__";
const aInterno = (v: string) => (v === "" ? VALOR_VACIO : v);
const desdeInterno = (v: string | null) => (v === null || v === VALOR_VACIO ? "" : v);

/**
 * Selector con forma de píldora de 44 px sobre `Select` de shadcn: fondo `superficie`, texto en
 * negrita. Se maneja con flechas, Enter y Esc y anuncia la opción elegida al lector de pantalla.
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
  const [anuncio, setAnuncio] = useState("");
  const items = opciones.map((o) => ({ value: aInterno(o.valor), label: o.etiqueta }));

  return (
    <div className="inline-flex min-w-0">
      <Select
        items={items}
        value={aInterno(valor)}
        disabled={disabled}
        onValueChange={(nuevo) => {
          const elegido = desdeInterno(nuevo);
          onCambio(elegido);
          const opcion = opciones.find((o) => o.valor === elegido);
          if (opcion) setAnuncio(`${etiqueta}: ${opcion.etiqueta}`);
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={prefijo ? `${prefijo}: ${etiqueta}` : etiqueta}
          className={cn(
            "h-11 min-w-0 cursor-pointer gap-2 rounded-full border-0 bg-superficie pr-3 pl-4 text-base font-bold text-texto data-[size=default]:h-11 dark:bg-superficie dark:hover:bg-superficie",
            borde && "border-2 border-texto",
            SIN_ANILLO,
            className,
          )}
        >
          {prefijo ? <span className="shrink-0 text-[15px] font-normal">{prefijo}</span> : null}
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className="rounded-lg border-2 border-borde bg-popover text-popover-foreground shadow-md"
        >
          {opciones.map((opcion) => (
            <SelectItem
              key={opcion.valor || VALOR_VACIO}
              value={aInterno(opcion.valor)}
              className="min-h-11 cursor-pointer rounded-md px-3 text-base font-medium text-texto focus:bg-sol focus:font-bold focus:text-sobre-sol"
            >
              {opcion.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </span>
    </div>
  );
}
