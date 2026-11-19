import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BotonGoogle } from "@/components/auth/BotonGoogle";
import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import { FormularioRegistroCliente } from "@/components/auth/FormularioRegistroCliente";
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
      <FormularioRegistroCliente barrios={barrios} />
    </>
  );
}

/**
 * Registro de cliente (LAB-17, rehecho en LAB-76): bocetos `App-RegistroCliente` y `Oscuro-RegistroCliente`.
 * Una sola columna centrada (hasta 480 px en celular y 560 px en escritorio, provista por `LayoutPublico`).
 */
export default function RegistroCliente() {
  return (
    <div className="flex flex-col gap-3.5">
      <EncabezadoAuth titulo="Creá tu cuenta" volverA="/" volverTexto="Volver" />
      <Suspense fallback={null}>
        <Formulario />
      </Suspense>
    </div>
  );
}
