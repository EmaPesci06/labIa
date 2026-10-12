import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";

export const metadata: Metadata = { title: "Mis trabajos · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-29.
export default function MisTrabajos() {
  return <PantallaPendiente titulo="Mis trabajos" />;
}
