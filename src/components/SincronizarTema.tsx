"use client";

import { useLayoutEffect } from "react";

import { aplicarTema, suscribirseAlTema } from "@/lib/tema";

/**
 * Mantiene la clase `dark` de <html> al día:
 * - la vuelve a poner si React la borra (remontaje de Strict Mode en desarrollo);
 * - sigue los cambios del tema del sistema cuando la preferencia es "sistema".
 * El primer pintado lo resuelve el script inline del layout.
 */
export function SincronizarTema() {
  useLayoutEffect(() => {
    aplicarTema();
    return suscribirseAlTema(() => {});
  }, []);

  return null;
}
