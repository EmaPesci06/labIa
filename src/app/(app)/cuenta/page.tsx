import type { Metadata } from "next";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { PantallaPendiente } from "@/components/navegacion/PantallaPendiente";
import { SelectorTema } from "@/components/SelectorTema";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = { title: "Mi cuenta · LabÍA" };

// Marcador de LAB-13 con el selector de tema; LAB-33 arma el resto de la cuenta.
export default function Cuenta() {
  return (
    <PantallaPendiente titulo="Mi cuenta">
      <SelectorTema className="mt-4" />
      {/* En celular no hay menú de avatar: "Salir" vive acá. LAB-33 arma el resto de la cuenta. */}
      <Boton href="/cuenta/emails" variante="secundario" className="mt-4 max-w-xs">
        Preferencias de email
      </Boton>
      <div className="mt-4 max-w-xs rounded-boton border border-borde bg-superficie p-1">
        <BotonSalir />
      </div>
    </PantallaPendiente>
  );
}
