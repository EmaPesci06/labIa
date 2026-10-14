import type { Metadata } from "next";

import { DocumentosCuenta } from "@/components/cuenta/DocumentosCuenta";
import { Boton } from "@/components/ui/Boton";
import { cargarDatosRegistro } from "@/lib/registro/borrador";

export const metadata: Metadata = { title: "Verificación · LabÍA" };

/** Volver a subir documentos de verificación (LAB-19). Solo para profesionales. */
export default async function Verificacion() {
  const { sesion, rol, borrador, verificaciones } = await cargarDatosRegistro();

  if (!sesion || rol !== "profesional") {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="font-titulo text-[28px] lg:text-4xl">Verificación</h1>
        <p role="status" className="text-texto-secundario">
          La verificación de documentos es para cuentas de profesional.
        </p>
        <Boton href="/cuenta" variante="secundario" className="max-w-xs">
          Volver a mi cuenta
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-xl flex-col gap-1">
        <h1 className="font-titulo text-[28px] lg:text-4xl">Verificación</h1>
        <p className="text-texto-secundario">
          Subí de nuevo lo que haya sido rechazado. Solo lo ve nuestro equipo.
        </p>
      </div>
      <DocumentosCuenta
        uid={sesion.uid}
        tieneGas={borrador.oficios.includes("gas")}
        verificaciones={verificaciones}
      />
    </div>
  );
}
