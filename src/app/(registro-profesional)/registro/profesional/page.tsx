import type { Metadata } from "next";
import { Suspense } from "react";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { FormularioPerfilProfesional } from "@/components/registro/FormularioPerfilProfesional";
import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";
import { inicioDelRol } from "@/lib/auth/rutas";
import { cargarDatosRegistro } from "@/lib/registro/borrador";

export const metadata: Metadata = { title: "Armá tu perfil de profesional · Oficio Seguro" };

async function Contenido({ searchParams }: PageProps<"/registro/profesional">) {
  const [{ sesion, rol, borrador, barrios, urls, verificaciones }, consulta] = await Promise.all([
    cargarDatosRegistro(),
    searchParams,
  ]);

  // Una cuenta de cliente (o admin) no arma perfil de profesional: se lo explicamos.
  if (sesion && rol && rol !== "profesional") {
    return (
      <div className="flex flex-1 flex-col">
        <SaltarAlContenido />
        <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          <AvisoPantalla
            titulo="Tu cuenta no es de profesional"
            texto="Para ofrecer tus servicios necesitás una cuenta de profesional. Salí de esta sesión y creá una nueva con otro email."
            accion={
              <Boton href={inicioDelRol(rol)} tamano="grande" bloque>
                Ir a mi inicio
              </Boton>
            }
          />
        </main>
      </div>
    );
  }

  const pasoInicial = consulta.paso === "documentos" && sesion && borrador.nombreCompleto ? 2 : 1;

  return (
    <FormularioPerfilProfesional
      // Al cambiar la sesión (por ejemplo al volver de confirmar el email) se parte de lo guardado.
      key={sesion?.uid ?? "visitante"}
      sesion={sesion}
      borrador={borrador}
      barrios={barrios}
      urls={urls}
      verificaciones={verificaciones}
      pasoInicial={pasoInicial}
    />
  );
}

/** Registro de profesional, pasos 1 y 2: perfil y documentos (LAB-18, LAB-19, LAB-77). */
export default function RegistroProfesional(props: PageProps<"/registro/profesional">) {
  return (
    <Suspense fallback={<p className="px-5 py-6 text-texto">Cargando…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
