"use client";

import { Star } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

type PropsLectura = {
  /** Puntaje de 0 a 5 (admite decimales: 4,5). */
  valor: number;
  onChange?: undefined;
};
type PropsSeleccion = {
  /** Puntaje elegido, de 0 (nada elegido) a 5. */
  valor: number;
  /** Con `onChange` las estrellas se vuelven un `radiogroup` de 1 a 5, usable con teclado. */
  onChange: (valor: number) => void;
};

export type EstrellasProps = (PropsLectura | PropsSeleccion) & {
  /** Nombre accesible del modo selección. */
  etiqueta?: string;
  className?: string;
};

const TOTAL = [1, 2, 3, 4, 5] as const;

function Estrella({ llena }: { llena: boolean }) {
  return (
    <Star
      aria-hidden
      strokeWidth={1.5}
      className={cn("size-5 text-naranja-marca", llena ? "fill-current" : "fill-transparent")}
    />
  );
}

/**
 * Puntaje con estrellas (naranja de marca). Solo lectura por defecto (`role="img"`); con `onChange`
 * es un grupo de 5 botones de radio de 44 px: flechas para cambiar, Inicio/Fin para 1 y 5.
 */
export function Estrellas({ valor, onChange, etiqueta = "Puntaje", className }: EstrellasProps) {
  const grupo = useRef<HTMLDivElement>(null);

  if (!onChange) {
    const redondeado = Math.round(Math.min(5, Math.max(0, valor)) * 10) / 10;
    const texto = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(redondeado);
    return (
      <span
        role="img"
        aria-label={`${texto} de 5 estrellas`}
        className={cn("relative inline-flex", className)}
      >
        <span className="flex">
          {TOTAL.map((n) => (
            <Estrella key={n} llena={false} />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden"
          style={{ width: `${(redondeado / 5) * 100}%` }}
        >
          {TOTAL.map((n) => (
            <Estrella key={n} llena />
          ))}
        </span>
      </span>
    );
  }

  const activa = valor >= 1 ? Math.min(5, Math.round(valor)) : 0;

  function elegir(nuevo: number) {
    onChange?.(nuevo);
    grupo.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[nuevo - 1]?.focus();
  }

  function teclado(evento: KeyboardEvent<HTMLDivElement>) {
    const actual = activa || 1;
    if (evento.key === "ArrowRight" || evento.key === "ArrowUp") {
      evento.preventDefault();
      elegir(activa === 0 ? 1 : Math.min(5, actual + 1));
    } else if (evento.key === "ArrowLeft" || evento.key === "ArrowDown") {
      evento.preventDefault();
      elegir(Math.max(1, actual - 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      elegir(1);
    } else if (evento.key === "End") {
      evento.preventDefault();
      elegir(5);
    }
  }

  return (
    <div
      ref={grupo}
      role="radiogroup"
      aria-label={etiqueta}
      onKeyDown={teclado}
      className={cn("flex", className)}
    >
      {TOTAL.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === activa}
          aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
          tabIndex={n === (activa || 1) ? 0 : -1}
          onClick={() => onChange(n)}
          className="flex size-11 items-center justify-center rounded-campo"
        >
          <Estrella llena={n <= activa} />
        </button>
      ))}
    </div>
  );
}
