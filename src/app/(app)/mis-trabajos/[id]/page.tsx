import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TarjetaTrabajo } from "@/components/TarjetaTrabajo";
import { Aviso } from "@/components/ui/Aviso";
import type { Oficio } from "@/lib/busqueda";
import { rolFalso } from "@/lib/auth/sesion-falsa";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Tu trabajo · LabÍA" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publicado?: string }>;
};

// TODO(LAB-29): reemplazar por el detalle completo con postulantes. Hoy solo confirma la
// publicación de LAB-26 y muestra la tarjeta del trabajo.
export default async function DetalleMiTrabajo({ params, searchParams }: Props) {
  const { id } = await params;
  const { publicado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const aviso = publicado === "1" && (
    <Aviso>¡Publicado! Te avisamos por email cuando alguien se postule.</Aviso>
  );

  if (rolFalso() || !supabaseConfigurado()) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="font-titulo text-[26px] lg:text-4xl">Tu trabajo</h1>
        {aviso}
      </div>
    );
  }

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("trabajos")
    .select("oficio, titulo, descripcion, urgencia, created_at, barrios(nombre)")
    .eq("id", id)
    .eq("cliente_id", sesion.usuario.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-titulo text-[26px] lg:text-4xl">Tu trabajo</h1>
      {aviso}
      <TarjetaTrabajo
        oficio={data.oficio as Oficio}
        barrio={data.barrios?.nombre ?? ""}
        creadoEn={data.created_at}
        titulo={data.titulo}
        descripcion={data.descripcion}
        urgencia={data.urgencia}
        postulantes={0}
      />
    </div>
  );
}
