import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { DocumentosCuenta } from "@/components/cuenta/DocumentosCuenta";
import { Boton } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { cargarDatosRegistro } from "@/lib/registro/borrador";

export const metadata: Metadata = { title: "Mi verificación · LabÍA" };

/** Volver a subir documentos de verificación (LAB-19). Solo para profesionales. */
export default async function Verificacion() {
  await connection();
  const { sesion, rol, borrador, verificaciones } = await cargarDatosRegistro();

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <header className="flex flex-col">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-bold text-texto"
        >
          <ArrowLeft aria-hidden strokeWidth={3} className="size-5" />
          Mi cuenta
        </Link>
        <h1 className="mt-0.5 font-titulo text-[38px] leading-none lg:text-[48px]">
          Mi verificación
        </h1>
        <p className="mt-2 text-base leading-snug text-texto">
          Subí de nuevo lo que haya sido rechazado. Solo lo ve nuestro equipo.
        </p>
      </header>

      {!sesion || rol !== "profesional" ? (
        <>
          <Tarjeta>
            <p role="status" className="text-texto">
              La verificación de documentos es para cuentas de profesional.
            </p>
          </Tarjeta>
          <Boton href="/cuenta" variante="secundario" className="self-start">
            Volver a mi cuenta
          </Boton>
        </>
      ) : (
        <DocumentosCuenta
          uid={sesion.uid}
          tieneGas={borrador.oficios.includes("gas")}
          verificaciones={verificaciones}
        />
      )}
    </div>
  );
}
