"use client";

// Proveedor de PostHog del layout raíz (LAB-15): inicializa solo si hay clave y registra una
// vista de página en cada cambio de ruta del App Router. No renderiza nada.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { registrarPaginaVista } from "@/lib/metricas";

export function MetricasPostHog() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) registrarPaginaVista(pathname);
  }, [pathname]);

  return null;
}
