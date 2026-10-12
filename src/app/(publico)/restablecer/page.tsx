import type { Metadata } from "next";
import { Suspense } from "react";

import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import {
  FormularioNuevaContrasena,
  FormularioPedirRestablecer,
} from "@/components/auth/FormulariosRestablecer";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Restablecer contraseña · LabÍA",
  robots: { index: false, follow: false },
};

/**
 * Sin sesión: pide el email y manda el link. Con sesión (se llega desde el link del email, que
 * pasa por `/api/auth/callback`): deja elegir la contraseña nueva.
 */
async function Contenido() {
  const sesion = await obtenerSesion();
  return sesion ? (
    <>
      <EncabezadoAuth titulo="Elegí tu contraseña nueva" volverA="/" />
      <FormularioNuevaContrasena />
    </>
  ) : (
    <>
      <EncabezadoAuth
        titulo="¿Olvidaste tu contraseña?"
        bajada="Escribí tu email y te mandamos un enlace para elegir una nueva."
        volverA="/ingresar"
      />
      <FormularioPedirRestablecer />
    </>
  );
}

export default function Restablecer() {
  return (
    <div className="flex flex-col gap-[18px]">
      <Suspense fallback={null}>
        <Contenido />
      </Suspense>
    </div>
  );
}
