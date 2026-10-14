import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FormularioNormas } from "@/components/normas/FormularioNormas";
import { ListaNormas } from "@/components/normas/ListaNormas";
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
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-titulo text-[30px] leading-tight">Actualizamos las normas</h1>
        <p className="text-[15px] leading-snug text-texto-secundario">
          Para seguir usando LabÍA, leé y aceptá las normas de seguridad vigentes.
        </p>
      </div>
      <ListaNormas />
      <FormularioNormas textoBoton="Aceptar y seguir" />
    </div>
  );
}

/** Re-aceptación cuando cambia la versión de las normas (LAB-20). */
export default function AceptarNormas() {
  return (
    <Suspense fallback={<p className="text-texto-secundario">Cargando…</p>}>
      <ContenidoAceptarNormas />
    </Suspense>
  );
}
