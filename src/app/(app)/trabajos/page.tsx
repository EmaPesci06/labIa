import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FiltrosTrabajos } from "@/components/trabajos/FiltrosTrabajos";
import type { MiPostulacionInfo } from "@/components/trabajos/FormularioPostulacion";
import { ListaPostulaciones } from "@/components/trabajos/ListaPostulaciones";
import { MaestroDetalleTrabajos } from "@/components/trabajos/MaestroDetalleTrabajos";
import { Boton } from "@/components/ui/Boton";
import { Encabezado } from "@/components/ui/Encabezado";
import { BannerVerificacion } from "@/components/verificacion/BannerVerificacion";
import type { Oficio } from "@/lib/busqueda";
import { obtenerMisVerificaciones } from "@/lib/registro/documentos";
import { obtenerSesion } from "@/lib/sesion";
import {
  formatearBajadaTrabajos,
  obtenerMisPostulaciones,
  obtenerPerfilParaTrabajos,
  obtenerTrabajosParaMi,
} from "@/lib/trabajos/consulta";
import {
  alcanzoElTopeDePaginas,
  hayMasTrabajos,
  leerPaginaTrabajos,
  limiteParaPagina,
  urlTrabajosConPagina,
} from "@/lib/trabajos/paginacion";
import { resumenBannerVerificacion } from "@/lib/verificacion/logica";

export const metadata: Metadata = { title: "Trabajos · LabÍA" };

type PaginaTrabajosProps = {
  searchParams: Promise<{
    vista?: string;
    oficio?: string;
    zonas?: string;
    trabajo?: string;
    pagina?: string;
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
      <>
        <Encabezado
          variante="plano"
          titulo="Mis postulaciones"
          descripcion="Seguí el estado de los trabajos a los que te postulaste."
          className="px-0 pt-0 pb-4 lg:px-0 lg:pt-0 lg:pb-6"
        >
          <BannerVerificacion resumen={resumen} />
        </Encabezado>

        <ListaPostulaciones postulaciones={postulaciones} />
      </>
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

  const pagina = leerPaginaTrabajos(params.pagina);
  const { trabajos, total } = await obtenerTrabajosParaMi({
    oficio: oficioFiltrado,
    soloMisZonas,
    limite: limiteParaPagina(pagina),
  });
  const urlFiltros = {
    oficio: oficioFiltrado,
    zonas: soloMisZonas ? null : "todas",
    trabajo: params.trabajo ?? null,
  };

  // Solo en escritorio hace falta el detalle: buscamos la postulación propia del trabajo elegido.
  let miPostulacionSeleccionada: MiPostulacionInfo | null = null;
  if (params.trabajo) {
    const mias = await obtenerMisPostulaciones();
    const propia = mias.find((p) => p.trabajoId === params.trabajo);
    if (propia) {
      miPostulacionSeleccionada = {
        id: propia.id,
        mensaje: propia.mensaje,
        precioEstimado: propia.precioEstimado,
        senaPropuesta: propia.senaPropuesta,
        estado: propia.estado,
        createdAt: propia.createdAt,
      };
    }
  }

  return (
    <>
      <Encabezado variante="sol" titulo="Trabajos para vos" descripcion={bajada}>
        <BannerVerificacion resumen={resumen} />
        {oficiosValidos.length > 0 ? (
          <FiltrosTrabajos
            oficios={oficiosValidos}
            oficioSeleccionado={oficioFiltrado}
            soloMisZonas={soloMisZonas}
          />
        ) : null}
      </Encabezado>

      <div className="mt-4 flex flex-col gap-3 lg:mt-6 lg:gap-4">
        <MaestroDetalleTrabajos
          trabajos={trabajos}
          trabajoSeleccionadoId={params.trabajo}
          miPostulacionSeleccionada={miPostulacionSeleccionada}
          publicado={perfil?.publicado ?? false}
        />

        {hayMasTrabajos(trabajos.length, total, pagina) ? (
          <Boton href={urlTrabajosConPagina(urlFiltros, pagina + 1)} variante="secundario" bloque>
            Ver más
          </Boton>
        ) : alcanzoElTopeDePaginas(trabajos.length, total, pagina) ? (
          <p className="text-center text-[15px] text-texto">
            Refiná los filtros para ver menos trabajos.
          </p>
        ) : null}
      </div>
    </>
  );
}
