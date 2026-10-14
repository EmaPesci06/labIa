import type { Metadata } from "next";

import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = { title: "Cuenta borrada · LabÍA", robots: { index: false } };

export default function CuentaEliminada() {
  return (
    <div className="flex flex-col gap-4 pt-8">
      <h1 className="font-titulo text-[28px] lg:text-4xl">Borramos tu cuenta</h1>
      <p className="text-[17px] leading-snug text-texto-secundario">
        Se borraron tu perfil, tus fotos, tus documentos y tus datos. Cerramos tu sesión. Gracias
        por haber pasado por LabÍA: si querés volver, vas a poder crear una cuenta nueva cuando
        quieras.
      </p>
      <Boton href="/" variante="cliente" tamano="grande" bloque>
        Ir al inicio
      </Boton>
    </div>
  );
}
