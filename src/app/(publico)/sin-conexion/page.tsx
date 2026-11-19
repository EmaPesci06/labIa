import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = {
  title: "Sin conexión · LabÍA",
  robots: { index: false, follow: false },
};

/**
 * La muestra el service worker (public/sw.js) cuando una página no se puede pedir a la red.
 * Se guarda en caché al instalar la app, así que no puede depender de datos (LAB-13, LAB-80:
 * boceto `App-Aviso`).
 */
export default function SinConexion() {
  return (
    <AvisoPantalla
      icono={WifiOff}
      titulo="Te quedaste sin conexión"
      texto="Revisá tu internet y volvé a intentar. Lo que estabas escribiendo no se perdió."
      accion={
        <Boton href="/inicio" tamano="grande" bloque>
          Reintentar
        </Boton>
      }
    />
  );
}
