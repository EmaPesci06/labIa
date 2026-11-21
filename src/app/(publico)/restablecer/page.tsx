import type { Metadata } from "next";
import { Suspense } from "react";

import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import {
  FormularioNuevaContrasena,
  FormularioPedirRestablecer,
} from "@/components/auth/FormulariosRestablecer";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Restablecer contraseña · Oficio Seguro",
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
      <EncabezadoAuth
        titulo="Cuando abrís el enlace"
        volverA="/ingresar"
        volverTexto="Volver a ingresar"
      />
      <FormularioNuevaContrasena />
    </>
  ) : (
    <>
      <EncabezadoAuth
        titulo="¿Te olvidaste la contraseña?"
        bajada="Pasa seguido. Decinos tu email y te mandamos un enlace para elegir una nueva."
        volverA="/ingresar"
        volverTexto="Volver a ingresar"
      />
      <FormularioPedirRestablecer />
    </>
  );
}

export default function Restablecer() {
  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <Contenido />
      </Suspense>
    </div>
  );
}
