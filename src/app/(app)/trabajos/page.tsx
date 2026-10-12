import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";

export const metadata: Metadata = { title: "Trabajos · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-27 (con ?vista=mias para las postulaciones).
export default function Trabajos() {
  return <PantallaPendiente titulo="Trabajos" />;
}
