import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";

export const metadata: Metadata = { title: "Publicar un trabajo · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-26.
export default function PublicarTrabajo() {
  return <PantallaPendiente titulo="Publicar un trabajo" />;
}
