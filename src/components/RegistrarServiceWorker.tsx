"use client";

import { useEffect } from "react";

/**
 * Registra /sw.js (public/sw.js) para que la app sea instalable y muestre /sin-conexion sin red.
 * Solo en producción: en desarrollo cachearía chunks viejos y confundiría al recargar.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sin service worker la app sigue andando; solo se pierde la pantalla sin conexión.
    });
  }, []);

  return null;
}
