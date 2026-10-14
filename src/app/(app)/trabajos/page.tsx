import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";
import { BannerVerificacion } from "@/components/verificacion/BannerVerificacion";
import { obtenerMisVerificaciones } from "@/lib/registro/documentos";
import { obtenerSesion } from "@/lib/sesion";
import { resumenBannerVerificacion } from "@/lib/verificacion/logica";

export const metadata: Metadata = { title: "Trabajos · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-27 (con ?vista=mias para las postulaciones).
// El banner de verificación (LAB-21) ya está acá: LAB-27 lo conserva al reemplazar el marcador.
export default async function Trabajos() {
  const sesion = await obtenerSesion();
  const resumen =
    sesion?.rol === "profesional"
      ? resumenBannerVerificacion(await obtenerMisVerificaciones())
      : null;

  return (
    <div className="flex flex-col gap-4">
      <BannerVerificacion resumen={resumen} />
      <PantallaPendiente titulo="Trabajos" />
    </div>
  );
}
