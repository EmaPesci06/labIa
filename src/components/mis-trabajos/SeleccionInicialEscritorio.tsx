"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { TabMisTrabajos } from "./PestanasMisTrabajos";

const MEDIA_ESCRITORIO = "(min-width: 1024px)";

type Props = {
  tabActiva: TabMisTrabajos;
  /** Primer trabajo de la lista. Null si no hay trabajos o ya hay uno seleccionado en la URL. */
  primerTrabajoId: string | null;
};

/**
 * Selección inicial del panel de detalle en escritorio (LAB-48).
 *
 * El servidor no conoce el ancho de pantalla, así que sin `?id=` no carga ningún detalle (en celular
 * no se muestra y no conviene pagar la consulta). En escritorio, este componente agrega el primer
 * trabajo a la URL con `router.replace`, igual que el prototipo, que muestra un trabajo seleccionado
 * desde el arranque. No renderiza nada.
 */
export function SeleccionInicialEscritorio({ tabActiva, primerTrabajoId }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!primerTrabajoId) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia(MEDIA_ESCRITORIO).matches) return;
    router.replace(`/mis-trabajos?tab=${tabActiva}&id=${primerTrabajoId}`, { scroll: false });
  }, [primerTrabajoId, router, tabActiva]);

  return null;
}
