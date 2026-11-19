import type { Metadata } from "next";

import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = { title: "Cuenta borrada · LabÍA", robots: { index: false } };

/** Confirmación tras borrar la cuenta (LAB-33, LAB-80: boceto `App-Aviso`). */
export default function CuentaEliminada() {
  return (
    <AvisoPantalla
      titulo="Borramos tu cuenta"
      texto="Se borraron tu perfil, tus fotos, tus documentos y tus datos. Cerramos tu sesión. Gracias por haber pasado por LabÍA: si querés volver, vas a poder crear una cuenta nueva cuando quieras."
      accion={
        <Boton href="/" tamano="grande" bloque>
          Ir al inicio
        </Boton>
      }
    />
  );
}
