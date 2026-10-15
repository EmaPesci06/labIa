import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DetalleMiTrabajo } from "@/components/mis-trabajos/DetalleMiTrabajo";
import { EnlaceVolver } from "@/components/perfil/EnlaceVolver";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerDetalleMiTrabajoCliente } from "@/lib/trabajos/consulta";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ publicado?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) return { title: "Detalle del trabajo · LabÍA" };

  const trabajo = await obtenerDetalleMiTrabajoCliente(id, sesion.usuario.id);
  if (!trabajo) return { title: "Trabajo no encontrado · LabÍA" };

  return {
    title: `${trabajo.titulo} · Mis trabajos · LabÍA`,
    description: trabajo.descripcion.slice(0, 160),
  };
}

export default async function DetalleMiTrabajoPage({ params, searchParams }: Props) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    const { id } = await params;
    redirect(`/ingresar?volver=/mis-trabajos/${id}`);
  }
  if (sesion.rol === "profesional") {
    redirect("/trabajos");
  }

  const { id } = await params;
  const { publicado } = (await searchParams) ?? {};
  const trabajo = await obtenerDetalleMiTrabajoCliente(id, sesion.usuario.id);

  if (!trabajo) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 py-2 lg:py-6">
      <EnlaceVolver href="/mis-trabajos" etiquetaEscritorio="Volver a mis trabajos" />
      <DetalleMiTrabajo
        trabajo={trabajo}
        mostrarTituloCompleto={true}
        publicado={publicado === "1"}
      />
    </div>
  );
}
