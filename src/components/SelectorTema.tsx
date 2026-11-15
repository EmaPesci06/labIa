"use client";

import { useId, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import {
  guardarPreferencia,
  leerPreferencia,
  PREFERENCIAS_TEMA,
  suscribirseAlTema,
  type PreferenciaTema,
} from "@/lib/tema";

const ETIQUETAS: Record<PreferenciaTema, string> = {
  claro: "Claro",
  oscuro: "Oscuro",
  sistema: "Sistema",
};

const leerDelNavegador = () => leerPreferencia(document.cookie);
const leerEnServidor = () => null;

type Props = {
  className?: string;
  /** Leyenda del grupo ("Aspecto" en /cuenta, "Tema" por defecto). */
  etiqueta?: string;
};

/** Elegir tema: Claro / Oscuro / Sistema. Se guarda en la cookie `tema`. */
export function SelectorTema({ className, etiqueta = "Tema" }: Props) {
  const nombre = useId();
  const preferencia = useSyncExternalStore(suscribirseAlTema, leerDelNavegador, leerEnServidor);

  return (
    <fieldset className={cn("m-0 border-0 p-0", className)}>
      <legend className="float-left mb-2 w-full p-0 text-[17px] font-bold text-texto">
        {etiqueta}
      </legend>
      <div className="clear-both grid grid-cols-3 gap-2">
        {PREFERENCIAS_TEMA.map((opcion) => (
          <label
            key={opcion}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-fondo px-2 text-[15px] text-texto has-checked:bg-sol has-checked:font-bold has-checked:text-sobre-sol has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco"
          >
            <input
              type="radio"
              name={nombre}
              value={opcion}
              checked={preferencia === opcion}
              onChange={() => guardarPreferencia(opcion)}
              className="sr-only"
            />
            {ETIQUETAS[opcion]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
