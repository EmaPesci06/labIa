"use client";

import { useMemo } from "react";

import { Combobox } from "@/components/ui/Combobox";
import { BARRIOS_FRECUENTES, type BarrioOpcion } from "@/lib/validaciones/registro-cliente";

type Props = {
  /** Todos los barrios de la tabla `barrios`. Vacío: se ofrecen los 7 más comunes. */
  barrios: BarrioOpcion[];
  /** Id del barrio elegido (texto) para repoblar el formulario. */
  valorInicial?: string;
  error?: string;
  /** Se llama al cambiar de barrio (para limpiar el error). */
  alCambiar?: () => void;
  /** Nombre del campo que viaja al servidor. */
  name?: string;
};

/**
 * Selector de barrio con búsqueda (`Combobox`, boceto `App-RegistroCliente`): ofrece los 7 barrios
 * más comunes más todos los que vengan de la tabla `barrios` sin repetir. Nunca se pide la dirección.
 */
export function SelectorBarrio({
  barrios,
  valorInicial = "",
  error,
  alCambiar,
  name = "barrio",
}: Props) {
  const opciones = useMemo(() => {
    const vistosIds = new Set<number>();
    const vistosNombres = new Set<string>();
    const lista: { valor: string; etiqueta: string }[] = [];
    for (const barrio of [...BARRIOS_FRECUENTES, ...barrios]) {
      const claveNombre = barrio.nombre.trim().toLowerCase();
      if (!vistosIds.has(barrio.id) && !vistosNombres.has(claveNombre)) {
        vistosIds.add(barrio.id);
        vistosNombres.add(claveNombre);
        lista.push({ valor: String(barrio.id), etiqueta: barrio.nombre });
      }
    }
    return lista;
  }, [barrios]);

  return (
    <Combobox
      etiqueta="Tu barrio"
      name={name}
      opciones={opciones}
      defaultValue={valorInicial}
      placeholder="Elegí tu barrio"
      placeholderBusqueda="Buscá tu barrio…"
      sinResultados="No encontramos ese barrio."
      ayuda="Nunca te pedimos la dirección."
      error={error}
      onValueChange={() => alCambiar?.()}
      required
    />
  );
}
