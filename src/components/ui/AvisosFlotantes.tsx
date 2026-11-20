"use client";

import { useSyncExternalStore } from "react";
import { toast, type ExternalToast } from "sonner";

import { Toaster } from "@/components/shadcn/sonner";
import { leerPreferencia, suscribirseAlTema, type PreferenciaTema } from "@/lib/tema";

const leerDelNavegador = () => leerPreferencia(document.cookie);
const leerEnServidor = () => null;

const TEMA_SONNER: Record<PreferenciaTema, "light" | "dark" | "system"> = {
  claro: "light",
  oscuro: "dark",
  sistema: "system",
};

/**
 * Muestra una confirmación pasajera con Sonner, anunciada con `role="status"` para lectores de
 * pantalla. Para avisos fijos en la página usá `Aviso` o `AvisoPantalla`.
 */
export function avisarExito(mensaje: string, opciones?: ExternalToast) {
  return toast.success(<span role="status">{mensaje}</span>, opciones);
}

/**
 * Contenedor global de avisos pasajeros (Sonner). Sincroniza el tema con `src/lib/tema.ts` y deja
 * espacio abajo en celular para no tapar la barra de navegación.
 */
export function AvisosFlotantes() {
  const preferencia = useSyncExternalStore(suscribirseAlTema, leerDelNavegador, leerEnServidor);
  const tema = preferencia ? TEMA_SONNER[preferencia] : "system";

  return (
    <Toaster
      theme={tema}
      position="bottom-center"
      mobileOffset={{ bottom: 84 }}
      containerAriaLabel="Avisos"
    />
  );
}
