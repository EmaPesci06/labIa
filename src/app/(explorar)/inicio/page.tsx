import type { Metadata } from "next";

import { TarjetaPublicar } from "@/components/busqueda/TarjetaPublicar";
import { InicioBusqueda } from "@/components/inicio/InicioBusqueda";
import { IrABuscarEnEscritorio } from "@/components/inicio/IrABuscarEnEscritorio";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { elegirBarrio } from "@/lib/barrios";
import { barrioDeLaCuenta, obtenerBarrios } from "@/lib/busqueda-servidor";
import { urlBusqueda } from "@/lib/busqueda-url";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Buscá un profesional en Mar del Plata · LabÍA",
  description:
    "Gas, electricidad, plomería, cerrajería, carpintería, pintura y mecánica: profesionales verificados cerca de tu barrio.",
};

/**
 * Inicio del cliente (Inicio del prototipo). También se ve sin cuenta: con la barra de visitante
 * ("Crear cuenta") y el mismo selector de barrio. En escritorio redirige a `/buscar`.
 */
export default async function Inicio() {
  const sesion = await obtenerSesion();
  const barrios = await obtenerBarrios();
  const barrio = elegirBarrio(barrios, undefined, await barrioDeLaCuenta(sesion));
  const nombre = sesion?.perfil.nombre?.trim();

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 lg:hidden">
      <IrABuscarEnEscritorio destino={urlBusqueda({ barrio })} />

      {sesion ? (
        <div className="flex items-center justify-between">
          <Logo alt="LabÍA" />
          <Avatar nombre={sesion.perfil.nombreVisible} className="size-10" />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <p className="text-[15px] text-texto-secundario">{nombre ? `Hola, ${nombre}` : "Hola"}</p>
        <h1 className="font-titulo text-[30px] leading-[1.1] tracking-[-0.5px]">
          ¿Qué necesitás arreglar?
        </h1>
      </div>

      <InicioBusqueda barrios={barrios} barrioInicial={barrio} />

      <TarjetaPublicar
        titulo="Publicá un trabajo"
        descripcion="Contá qué necesitás y los profesionales de tu zona se postulan."
        accion="Publicar"
      />
    </div>
  );
}
