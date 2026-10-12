import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";

export const metadata: Metadata = { title: "Perfil · LabÍA" };

// Marcador de LAB-13; la pantalla real es de LAB-24.
export default function PerfilProfesional() {
  return <PantallaPendiente titulo="Perfil" />;
}
