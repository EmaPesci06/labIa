import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { BannerVerificacion } from "@/components/verificacion/BannerVerificacion";
import { FiltrosTrabajos } from "@/components/trabajos/FiltrosTrabajos";
import { ListaPostulaciones } from "@/components/trabajos/ListaPostulaciones";
import { MaestroDetalleTrabajos } from "@/components/trabajos/MaestroDetalleTrabajos";
import type { Oficio } from "@/lib/busqueda";
import { obtenerMisVerificaciones } from "@/lib/registro/documentos";
import { obtenerSesion } from "@/lib/sesion";
import {
  formatearBajadaTrabajos,
  obtenerMisPostulaciones,
  obtenerPerfilParaTrabajos,
  obtenerTrabajosParaMi,
} from "@/lib/trabajos/consulta";
import { resumenBannerVerificacion } from "@/lib/verificacion/logica";

export const metadata: Metadata = { title: "Trabajos · LabÍA" };

type PaginaTrabajosProps = {
  searchParams: Promise<{
    vista?: string;
    oficio?: string;
    zonas?: string;
    trabajo?: string;
  }>;
};

export default async function Trabajos({ searchParams }: PaginaTrabajosProps) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar");
  if (sesion.rol === "cliente") redirect("/mis-trabajos");

  const params = await searchParams;
  const esVistaMias = params.vista === "mias";

  // Banner según estado de verificación (LAB-21)
  const resumen = resumenBannerVerificacion(await obtenerMisVerificaciones());

  if (esVistaMias) {
    const postulaciones = await obtenerMisPostulaciones();

    return (
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header className="flex flex-col gap-3">
          <BannerVerificacion resumen={resumen} />
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto lg:text-[34px]">
                Mis postulaciones
              </h1>
              <p className="text-sm text-texto-secundario lg:text-[15px]">
                Seguí el estado de los trabajos a los que te postulaste.
              </p>
            </div>
            <div className="shrink-0 lg:hidden">
              <Avatar nombre={sesion.perfil.nombreVisible} tamano={44} />
            </div>
          </div>
        </header>

        <ListaPostulaciones postulaciones={postulaciones} />
      </div>
    );
  }

  // Vista principal de trabajos disponibles
  const perfil = await obtenerPerfilParaTrabajos(sesion.usuario.id);
  const oficiosValidos = perfil?.oficios ?? [];
  const oficioFiltrado =
    params.oficio && oficiosValidos.includes(params.oficio as Oficio)
      ? (params.oficio as Oficio)
      : null;
  const soloMisZonas = params.zonas !== "todas";

  const bajada = perfil
    ? formatearBajadaTrabajos(perfil.oficios, perfil.zonasNombres, perfil.todaLaCiudad)
    : "Mar del Plata";

  const { trabajos } = await obtenerTrabajosParaMi({
    oficio: oficioFiltrado,
    soloMisZonas,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <BannerVerificacion resumen={resumen} />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-texto lg:text-[34px]">
              Trabajos para vos
            </h1>
            <p className="text-sm text-texto-secundario lg:text-[15px]">{bajada}</p>
          </div>
          <div className="shrink-0 lg:hidden">
            <Avatar nombre={sesion.perfil.nombreVisible} tamano={44} />
          </div>
        </div>
      </header>

      {oficiosValidos.length > 0 ? (
        <FiltrosTrabajos
          oficios={oficiosValidos}
          oficioSeleccionado={oficioFiltrado}
          soloMisZonas={soloMisZonas}
        />
      ) : null}

      <MaestroDetalleTrabajos
        trabajos={trabajos}
        trabajoSeleccionadoId={params.trabajo}
        publicado={perfil?.publicado ?? false}
      />
    </div>
  );
}
