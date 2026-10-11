"use client";

import { useId, useSyncExternalStore } from "react";

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

/** Elegir tema: Claro / Oscuro / Sistema. Se guarda en la cookie `tema`. */
export function SelectorTema({ className }: { className?: string }) {
  const nombre = useId();
  const preferencia = useSyncExternalStore(suscribirseAlTema, leerDelNavegador, leerEnServidor);

  return (
    <fieldset className={className}>
      <legend className="mb-2 font-mono text-sm font-medium tracking-[0.4px] text-texto-secundario uppercase">
        Tema
      </legend>
      <div className="inline-flex rounded-full border border-borde bg-superficie p-1">
        {PREFERENCIAS_TEMA.map((opcion) => (
          <label
            key={opcion}
            className="flex min-h-11 min-w-11 cursor-pointer items-center rounded-full px-4 text-sm font-bold text-texto-secundario has-checked:bg-azul has-checked:text-sobre-azul has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco"
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
