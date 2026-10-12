import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";

export const metadata: Metadata = { title: "Buscar profesionales · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-23.
export default function Buscar() {
  return <PantallaPendiente titulo="Buscar profesionales" />;
}
