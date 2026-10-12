import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BotonGoogle, SeparadorO } from "@/components/auth/BotonGoogle";
import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import { FormularioRegistroCliente } from "@/components/auth/FormularioRegistroCliente";
import { PanelBeneficios } from "@/components/auth/PanelBeneficios";
import { listarBarrios } from "@/lib/barrios";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Crear cuenta · LabÍA" };

async function Formulario() {
  // Con sesión (volvió de Google o confirmó el email) solo falta completar WhatsApp y barrio.
  if (await obtenerSesion()) redirect("/registro/cliente/completar");
  const barrios = await listarBarrios();
  return (
    <>
      <BotonGoogle rol="cliente" />
      <SeparadorO />
      <FormularioRegistroCliente barrios={barrios} />
    </>
  );
}

// En escritorio la pantalla se ensancha más allá de la columna del grupo (publico): formulario a
// la izquierda y panel de beneficios a la derecha.
export default function RegistroCliente() {
  return (
    <div className="lg:relative lg:left-1/2 lg:grid lg:w-[min(1040px,calc(100vw-80px))] lg:-translate-x-1/2 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-start lg:gap-14">
      <div className="flex flex-col gap-[18px]">
        <EncabezadoAuth
          titulo="Creá tu cuenta"
          bajada="Con tu contacto, los profesionales pueden responderte por WhatsApp."
          contexto="Quiero contratar"
        />
        <Suspense fallback={null}>
          <Formulario />
        </Suspense>
        <p className="text-center text-[15px] text-texto-secundario">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/ingresar"
            className="inline-block py-3 font-bold text-azul underline underline-offset-2"
          >
            Ingresar
          </Link>
        </p>
        <p className="hidden text-center text-[15px] text-texto-secundario lg:block">
          ¿Ofrecés un servicio?{" "}
          <Link
            href="/registro/profesional"
            className="inline-block py-3 font-bold text-azul underline underline-offset-2"
          >
            Registrate como profesional
          </Link>
        </p>
      </div>
      <div className="lg:sticky lg:top-8 lg:mt-[72px]">
        <PanelBeneficios />
      </div>
    </div>
  );
}
