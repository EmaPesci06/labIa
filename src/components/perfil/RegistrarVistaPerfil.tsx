"use client";

import { useEffect } from "react";

import type { Oficio } from "@/lib/busqueda";
import { registrarEvento } from "@/lib/metricas";

/** Manda el evento `perfil_visto {oficio}` una vez al abrir el perfil. No dibuja nada. */
export function RegistrarVistaPerfil({ oficio }: { oficio: Oficio }) {
  useEffect(() => {
    registrarEvento("perfil_visto", { oficio });
  }, [oficio]);
  return null;
}
