"use client";

import { useRouter } from "next/navigation";

import type { Barrio } from "@/lib/barrios-busqueda";

import { SelectorPastilla } from "./SelectorPastilla";

type Props = {
  barrios: readonly Barrio[];
  /** Slug del barrio que está en uso. */
  valor: string;
  /** Pantalla a la que lleva el cambio: `/inicio` o `/buscar`. El barrio viaja en `?barrio=`. */
  ruta: "/inicio" | "/buscar";
  /** "Estás en": en la barra superior, con borde. Sin prefijo, en el encabezado del inicio. */
  prefijo?: string;
  borde?: boolean;
};

/**
 * Selector de barrio de referencia. Cambiarlo vale solo para la búsqueda que se está viendo: no
 * toca la cuenta (la URL es el estado). Sin barrios cargados muestra el Centro, deshabilitado.
 */
export function SelectorBarrio({ barrios, valor, ruta, prefijo, borde }: Props) {
  const router = useRouter();
  const opciones =
    barrios.length > 0
      ? barrios.map((b) => ({ valor: b.slug, etiqueta: b.nombre }))
      : [{ valor, etiqueta: "Centro" }];

  return (
    <SelectorPastilla
      etiqueta="Tu barrio"
      valor={valor}
      opciones={opciones}
      prefijo={prefijo}
      borde={borde}
      disabled={barrios.length === 0}
      onCambio={(slug) => router.push(`${ruta}?barrio=${encodeURIComponent(slug)}`)}
    />
  );
}
