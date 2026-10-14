import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Insignia } from "@/components/ui/Insignia";
import { FormularioPostulacion } from "@/components/trabajos/FormularioPostulacion";
import { GaleriaFotosTrabajo } from "@/components/trabajos/GaleriaFotosTrabajo";
import { formatearDistancia, formatearPesos, haceCuanto } from "@/lib/formato";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerTrabajoDetalle } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

type PaginaDetalleTrabajoProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PaginaDetalleTrabajoProps): Promise<Metadata> {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) return { title: "Detalle del trabajo · LabÍA" };

  const { trabajo } = await obtenerTrabajoDetalle(id, sesion.usuario.id);
  if (!trabajo) return { title: "Trabajo no encontrado · LabÍA" };

  return {
    title: `${trabajo.titulo} · LabÍA`,
    description: trabajo.descripcion.slice(0, 160),
  };
}

export default async function PaginaDetalleTrabajo({ params }: PaginaDetalleTrabajoProps) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar");
  if (sesion.rol === "cliente") redirect("/mis-trabajos");

  const { id } = await params;
  const { trabajo, perfil } = await obtenerTrabajoDetalle(id, sesion.usuario.id);

  if (!trabajo) notFound();

  const cuando = haceCuanto(trabajo.createdAt);
  const clienteNombreVisible = trabajo.cliente.nombre
    ? `${trabajo.cliente.nombre}${trabajo.cliente.apellidoInicial ? ` ${trabajo.cliente.apellidoInicial}.` : ""}`
    : "Cliente de LabÍA";
  const clienteNombreParaFormulario = trabajo.cliente.nombre ?? "el cliente";

  const partesMono = [
    ETIQUETA_OFICIO[trabajo.oficio],
    trabajo.barrioNombre,
    cuando,
    trabajo.distanciaKm !== null ? formatearDistancia(trabajo.distanciaKm) : null,
  ].filter((p): p is string => Boolean(p));

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 pb-8">
      {/* Botón volver a la lista */}
      <Link
        href="/trabajos"
        aria-label="Volver"
        className="flex size-11 items-center justify-center rounded-xl text-texto transition-colors hover:bg-superficie focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <ChevronLeft aria-hidden strokeWidth={2.2} className="size-6" />
      </Link>

      {/* Encabezado del trabajo */}
      <div className="flex flex-col gap-2">
        <EtiquetaMono partes={partesMono} />
        <h1 className="font-titulo text-[28px] leading-tight font-extrabold tracking-tight text-texto">
          {trabajo.titulo}
        </h1>
        <div className="self-start pt-1">
          <Insignia variante={trabajo.urgencia === "lo_antes_posible" ? "urgencia" : "verificada"}>
            {ETIQUETA_URGENCIA[trabajo.urgencia]}
          </Insignia>
        </div>
      </div>

      {/* Descripción completa */}
      <p className="text-base leading-relaxed whitespace-pre-line text-texto">
        {trabajo.descripcion}
      </p>

      {/* Fotos del cliente en grilla de 2 (tocar = visor) */}
      {trabajo.fotos.length > 0 ? (
        <GaleriaFotosTrabajo fotos={trabajo.fotos} tituloTrabajo={trabajo.titulo} />
      ) : null}

      {/* Presupuesto estimado si lo puso */}
      {trabajo.presupuestoEstimado !== null ? (
        <div className="rounded-xl border border-divisor bg-superficie p-3.5 text-sm font-semibold text-texto-secundario">
          El cliente estima {formatearPesos(trabajo.presupuestoEstimado)}
        </div>
      ) : null}

      {/* Tarjeta del cliente */}
      <div className="flex items-center gap-3 rounded-2xl border border-divisor bg-superficie p-3.5">
        <Avatar nombre={clienteNombreVisible} tamano={44} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold text-texto">{clienteNombreVisible}</span>
          <span className="truncate text-[13px] text-texto-secundario">
            Cliente · {trabajo.barrioNombre} · La dirección se comparte al acordar
          </span>
        </div>
      </div>

      {/* Formulario de postulación o estado actual */}
      <FormularioPostulacion
        trabajoId={trabajo.id}
        clienteNombre={clienteNombreParaFormulario}
        trabajoEstado={trabajo.estado}
        publicado={perfil?.publicado ?? false}
        miPostulacion={trabajo.miPostulacion}
      />
    </div>
  );
}
