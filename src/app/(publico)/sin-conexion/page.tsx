import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = {
  title: "Sin conexión · LabÍA",
  robots: { index: false, follow: false },
};

/**
 * La muestra el service worker (public/sw.js) cuando una página no se puede pedir a la red.
 * Se guarda en caché al instalar la app, así que no puede depender de datos.
 */
export default function SinConexion() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <WifiOff aria-hidden strokeWidth={2} className="size-12 text-naranja-marca" />
      <h1 className="font-titulo text-[28px]">Sin conexión</h1>
      <p className="text-base text-texto-secundario">
        Sin conexión. Revisá tu internet y volvé a intentar.
      </p>
      <Boton href="/inicio" variante="cliente" tamano="grande">
        Reintentar
      </Boton>
    </div>
  );
}
