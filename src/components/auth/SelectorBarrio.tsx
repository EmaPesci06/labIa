"use client";

import { useMemo } from "react";

import { Campo } from "@/components/ui/Campo";
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
 * Selector de barrio (`<select>`, boceto `App-RegistroCliente`): ofrece los 7 barrios más comunes
 * más todos los que vengan de la tabla `barrios` sin repetir. Nunca se pide la dirección.
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
    const lista: BarrioOpcion[] = [];
    for (const barrio of [...BARRIOS_FRECUENTES, ...barrios]) {
      const claveNombre = barrio.nombre.trim().toLowerCase();
      if (!vistosIds.has(barrio.id) && !vistosNombres.has(claveNombre)) {
        vistosIds.add(barrio.id);
        vistosNombres.add(claveNombre);
        lista.push(barrio);
      }
    }
    return lista;
  }, [barrios]);

  return (
    <Campo
      variante="seleccion"
      etiqueta="Tu barrio"
      name={name}
      defaultValue={valorInicial}
      ayuda="Nunca te pedimos la dirección."
      error={error}
      onChange={() => alCambiar?.()}
      required
    >
      <option value="">Elegí tu barrio</option>
      {opciones.map((barrio) => (
        <option key={barrio.id} value={String(barrio.id)}>
          {barrio.nombre}
        </option>
      ))}
    </Campo>
  );
}
