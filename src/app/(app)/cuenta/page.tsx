import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";
import { SelectorTema } from "@/components/SelectorTema";

export const metadata: Metadata = { title: "Mi cuenta · LabÍA" };

// Marcador de LAB-13 con el selector de tema; LAB-33 arma el resto de la cuenta.
export default function Cuenta() {
  return (
    <PantallaPendiente titulo="Mi cuenta">
      <SelectorTema className="mt-4" />
    </PantallaPendiente>
  );
}
