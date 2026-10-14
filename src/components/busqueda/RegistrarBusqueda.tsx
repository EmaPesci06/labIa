"use client";

import { useEffect } from "react";

import { registrarEvento } from "@/lib/metricas";
import type { Oficio } from "@/lib/oficios";

type Props = {
  oficio: Oficio | undefined;
  barrioId: number | undefined;
  resultados: number;
};

/** Registra `busqueda_realizada` una vez por búsqueda (cambia con el oficio, el barrio o la cantidad). */
export function RegistrarBusqueda({ oficio, barrioId, resultados }: Props) {
  useEffect(() => {
    // Sin oficio ("Todos") o sin barrio resuelto no hay evento: la lista de eventos pide ambos.
    if (!oficio || barrioId === undefined) return;
    registrarEvento("busqueda_realizada", { oficio, barrio_id: barrioId, resultados });
  }, [oficio, barrioId, resultados]);

  return null;
}
