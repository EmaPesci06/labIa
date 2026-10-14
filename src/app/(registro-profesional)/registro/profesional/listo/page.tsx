import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { EstructuraRegistro } from "@/components/registro/EstructuraRegistro";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = { title: "Perfil enviado · LabÍA" };

/** Confirmación al terminar el registro de profesional (LAB-20). */
export default function RegistroProfesionalListo() {
  return (
    <EstructuraRegistro paso={2}>
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 pt-8 text-center">
        <CheckCircle2 aria-hidden strokeWidth={2} className="size-14 text-exito" />
        <h1 className="font-titulo text-[30px] leading-tight">¡Listo!</h1>
        <p className="text-[17px] leading-snug text-texto-secundario">
          Estamos revisando tus documentos. Mientras tanto ya podés ver trabajos.
        </p>
        <Boton href="/trabajos" variante="profesional" tamano="grande" bloque>
          Ver trabajos
        </Boton>
      </div>
    </EstructuraRegistro>
  );
}
