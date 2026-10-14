import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FormularioNormas } from "@/components/normas/FormularioNormas";
import { ListaNormas, QueHaceLabia } from "@/components/normas/ListaNormas";
import { EstructuraRegistro } from "@/components/registro/EstructuraRegistro";
import { VistaPreviaPerfil } from "@/components/registro/VistaPreviaPerfil";
import { Boton } from "@/components/ui/Boton";
import { inicioDelRol } from "@/lib/auth/rutas";
import { faltantesRegistrados } from "@/lib/registro/documentos-estado";
import { cargarDatosRegistro } from "@/lib/registro/borrador";
import { OFICIOS } from "@/lib/validaciones/perfil-profesional";

export const metadata: Metadata = { title: "Normas de seguridad · LabÍA" };

async function Contenido() {
  const { sesion, rol, borrador, barrios, urls, verificaciones } = await cargarDatosRegistro();

  if (sesion && rol && rol !== "profesional") {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 pt-4">
        <h1 className="font-titulo text-[30px] leading-tight">Tu cuenta no es de profesional</h1>
        <p role="status" className="text-[15px] text-texto-secundario">
          Las normas de seguridad son para quienes ofrecen sus servicios en LabÍA.
        </p>
        <Boton href={inicioDelRol(rol)} variante="cliente" tamano="grande" bloque>
          Ir a mi inicio
        </Boton>
      </div>
    );
  }

  // Sin DNI y antecedentes (y matrícula si es gasista) registrados no hay paso 2: se vuelve al 1.
  if (
    sesion &&
    rol === "profesional" &&
    faltantesRegistrados(verificaciones, borrador.oficios.includes("gas")).length > 0
  ) {
    redirect("/registro/profesional");
  }

  const oficios = OFICIOS.filter((o) => borrador.oficios.includes(o.valor))
    .map((o) => o.etiqueta)
    .join(", ");
  const zonas = borrador.todaLaCiudad
    ? "Toda la ciudad"
    : barrios
        .filter((b) => borrador.zonas.includes(b.id))
        .map((b) => b.nombre)
        .join(", ");
  const foto = borrador.fotoPerfil ? (urls[borrador.fotoPerfil] ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 lg:grid lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10 lg:gap-y-7">
      <div className="flex flex-col gap-5 lg:gap-7">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <h1 className="font-titulo text-[30px] leading-tight lg:text-[40px]">
            Normas de seguridad
          </h1>
          <p className="text-[15px] leading-snug text-texto-secundario lg:text-[17px]">
            Los clientes te abren la puerta de su casa. Para que confíen en vos, te comprometés a:
          </p>
        </div>
        <ListaNormas dosColumnas />
        <QueHaceLabia />
        <FormularioNormas textoBoton="Enviar mi perfil a revisión" />
        <p className="text-center text-[13px] leading-snug text-texto-terciario lg:text-left lg:text-sm">
          Tu perfil se publica cuando revisemos tu DNI y tu certificado de antecedentes. Te avisamos
          por email.
        </p>
      </div>
      <aside className="hidden flex-col gap-4 lg:sticky lg:top-6 lg:flex lg:self-start">
        <VistaPreviaPerfil
          nombre={borrador.nombreCompleto}
          oficios={oficios}
          zonas={zonas}
          foto={foto}
        />
        <Boton href="/registro/profesional" variante="fantasma">
          Editar mi perfil
        </Boton>
      </aside>
    </div>
  );
}

/** Registro de profesional, paso 2: normas de seguridad (LAB-20). */
export default function RegistroProfesionalNormas() {
  return (
    <EstructuraRegistro paso={2}>
      <Suspense fallback={<p className="text-texto-secundario">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </EstructuraRegistro>
  );
}
