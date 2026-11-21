import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FormularioNormas } from "@/components/normas/FormularioNormas";
import { ListaNormasRegistro } from "@/components/normas/ListaNormasRegistro";
import { Encabezado } from "@/components/ui/Encabezado";
import { inicioDelRol } from "@/lib/auth/rutas";
import { normasAlDia } from "@/lib/normas";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Normas actualizadas · LabÍA" };

async function ContenidoAceptarNormas() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=%2Fnormas%2Faceptar");
  if (sesion.rol !== "profesional" || normasAlDia(sesion.normasVersion)) {
    redirect(inicioDelRol(sesion.rol));
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 pt-2 lg:relative lg:left-1/2 lg:w-[min(720px,calc(100vw-80px))] lg:-translate-x-1/2 lg:gap-5">
      <Encabezado
        variante="sol"
        titulo="Te abren la puerta de su casa"
        descripcion="Actualizamos las normas. Para seguir usando LabÍA, te comprometés a:"
      />
      <ListaNormasRegistro />
      <div className="-mx-5 mt-auto -mb-8 rounded-t-hoja bg-superficie px-5 pt-3 pb-4 lg:mx-0 lg:mt-2 lg:mb-0 lg:rounded-3xl lg:p-5">
        <FormularioNormas textoBoton="Aceptar y seguir" />
      </div>
    </div>
  );
}

/** Re-aceptación cuando cambia la versión de las normas (LAB-20, LAB-77: `App-ProNormas`). */
export default function AceptarNormas() {
  return (
    <Suspense fallback={<p className="py-6 text-texto">Cargando…</p>}>
      <ContenidoAceptarNormas />
    </Suspense>
  );
}
