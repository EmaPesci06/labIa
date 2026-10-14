import type { Metadata } from "next";

import { EstructuraRegistro } from "@/components/registro/EstructuraRegistro";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = { title: "Normas de seguridad · LabÍA" };

// TODO(LAB-20): el paso 2 (leer y aceptar las normas, guardar la versión aceptada y seguir a los
// documentos) reemplaza esta pantalla. Mientras tanto, el paso 1 ya tiene adónde llevar.
export default function RegistroProfesionalNormas() {
  return (
    <EstructuraRegistro paso={2}>
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 pt-4">
        <h1 className="font-titulo text-[30px] leading-tight">Normas de seguridad</h1>
        <p className="text-[15px] text-texto-secundario">
          Tu perfil quedó guardado. Muy pronto vas a poder leer y aceptar las normas desde acá.
        </p>
        <Boton href="/registro/profesional" variante="secundario" tamano="grande" bloque>
          Volver a mi perfil
        </Boton>
      </div>
    </EstructuraRegistro>
  );
}
