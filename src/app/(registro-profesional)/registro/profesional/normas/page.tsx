import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FormularioNormas } from "@/components/normas/FormularioNormas";
import { ListaNormasRegistro } from "@/components/normas/ListaNormasRegistro";
import { EstructuraRegistro } from "@/components/registro/EstructuraRegistro";
import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";
import { inicioDelRol } from "@/lib/auth/rutas";
import { cargarDatosRegistro } from "@/lib/registro/borrador";
import { faltantesRegistrados } from "@/lib/registro/documentos-estado";

export const metadata: Metadata = { title: "Normas de seguridad · Oficio Seguro" };

async function Contenido() {
  const { sesion, rol, borrador, verificaciones } = await cargarDatosRegistro();

  if (sesion && rol && rol !== "profesional") {
    return (
      <AvisoPantalla
        titulo="Tu cuenta no es de profesional"
        texto="Las normas de seguridad son para quienes ofrecen sus servicios en Oficio Seguro."
        accion={
          <Boton href={inicioDelRol(rol)} tamano="grande" bloque>
            Ir a mi inicio
          </Boton>
        }
      />
    );
  }

  // Sin DNI y antecedentes (y matrícula si es gasista) registrados no hay paso 3: se vuelve al 1.
  if (
    sesion &&
    rol === "profesional" &&
    faltantesRegistrados(verificaciones, borrador.oficios.includes("gas")).length > 0
  ) {
    redirect("/registro/profesional");
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <ListaNormasRegistro />
      <div className="-mx-5 mt-auto -mb-6 flex flex-col gap-1 rounded-t-hoja bg-superficie px-5 pt-3 pb-4 lg:mx-0 lg:mt-4 lg:mb-0 lg:rounded-3xl lg:p-5">
        <FormularioNormas textoBoton="Aceptar y terminar" />
        <p className="text-center text-[13px] leading-[1.35] text-texto">
          Al continuar aceptás los{" "}
          <Link
            href="/terminos"
            prefetch={false}
            className="font-bold underline decoration-2 underline-offset-4"
          >
            Términos
          </Link>{" "}
          y la{" "}
          <Link
            href="/privacidad"
            prefetch={false}
            className="font-bold underline decoration-2 underline-offset-4"
          >
            Política de privacidad
          </Link>
          .
        </p>
        <Link
          href="/registro/profesional?paso=documentos"
          className="inline-flex min-h-11 items-center justify-center self-center px-3 text-[15px] font-bold text-texto underline decoration-2 underline-offset-4"
        >
          Volver a documentos
        </Link>
      </div>
    </div>
  );
}

/** Registro de profesional, paso 3: normas de seguridad (LAB-20, LAB-77). */
export default function RegistroProfesionalNormas() {
  return (
    <EstructuraRegistro
      paso={3}
      titulo="Te abren la puerta de su casa"
      descripcion="Para que confíen en vos, te comprometés a:"
      ancho="lectura"
      tituloChico
    >
      <Suspense fallback={<p className="text-texto">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </EstructuraRegistro>
  );
}
