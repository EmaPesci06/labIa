import type { Metadata } from "next";
import { Suspense } from "react";

import { EstructuraRegistro } from "@/components/registro/EstructuraRegistro";
import { FormularioPerfilProfesional } from "@/components/registro/FormularioPerfilProfesional";
import { Boton } from "@/components/ui/Boton";
import { inicioDelRol } from "@/lib/auth/rutas";
import { cargarDatosRegistro } from "@/lib/registro/borrador";

export const metadata: Metadata = { title: "Armá tu perfil de profesional · LabÍA" };

async function Contenido() {
  const { sesion, rol, borrador, barrios, urls } = await cargarDatosRegistro();

  // Una cuenta de cliente (o admin) no arma perfil de profesional: se lo explicamos.
  if (sesion && rol && rol !== "profesional") {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 pt-4">
        <h1 className="font-titulo text-[30px] leading-tight">Tu cuenta no es de profesional</h1>
        <p role="status" className="text-[15px] text-texto-secundario">
          Para ofrecer tus servicios necesitás una cuenta de profesional. Salí de esta sesión y creá
          una nueva con otro email.
        </p>
        <Boton href={inicioDelRol(rol)} variante="cliente" tamano="grande" bloque>
          Ir a mi inicio
        </Boton>
      </div>
    );
  }

  return (
    <FormularioPerfilProfesional
      // Al cambiar la sesión (por ejemplo al volver de confirmar el email) se parte de lo guardado.
      key={sesion?.uid ?? "visitante"}
      sesion={sesion}
      borrador={borrador}
      barrios={barrios}
      urls={urls}
    />
  );
}

/** Registro de profesional, paso 1: el perfil (LAB-18). */
export default function RegistroProfesional() {
  return (
    <EstructuraRegistro paso={1}>
      <Suspense fallback={<p className="text-texto-secundario">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </EstructuraRegistro>
  );
}
