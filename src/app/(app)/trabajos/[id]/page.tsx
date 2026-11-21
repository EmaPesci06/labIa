import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BotonReportar } from "@/components/reportes/BotonReportar";
import { FormularioPostulacion } from "@/components/trabajos/FormularioPostulacion";
import { GaleriaFotosTrabajo } from "@/components/trabajos/GaleriaFotosTrabajo";
import { Encabezado } from "@/components/ui/Encabezado";
import { formatearDistancia, formatearPesos, haceCuanto } from "@/lib/formato";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerTrabajoDetalle } from "@/lib/trabajos/consulta";
import {
  ETIQUETA_OFICIO,
  ETIQUETA_URGENCIA,
  type UrgenciaTrabajo,
} from "@/lib/validaciones/trabajo";

type PaginaDetalleTrabajoProps = {
  params: Promise<{ id: string }>;
};

const ETIQUETA_PARA: Record<UrgenciaTrabajo, string> = {
  lo_antes_posible: "Hoy",
  esta_semana: "Esta semana",
  sin_apuro: "Sin apuro",
};

export async function generateMetadata({ params }: PaginaDetalleTrabajoProps): Promise<Metadata> {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) return { title: "Detalle del trabajo · Oficio Seguro" };

  const { trabajo } = await obtenerTrabajoDetalle(id, sesion.usuario.id);
  if (!trabajo) return { title: "Trabajo no encontrado · Oficio Seguro" };

  return {
    title: `${trabajo.titulo} · Oficio Seguro`,
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
    : "Cliente de Oficio Seguro";
  const clienteNombreParaFormulario = trabajo.cliente.nombre ?? "el cliente";
  const distanciaNumero =
    trabajo.distanciaKm !== null
      ? formatearDistancia(trabajo.distanciaKm).replace(/^a /, "")
      : null;

  return (
    <>
      <Encabezado
        variante="sol"
        titulo={trabajo.titulo}
        descripcion={`${ETIQUETA_OFICIO[trabajo.oficio]} · publicado ${cuando}`}
        volver={{ href: "/trabajos", etiqueta: "Trabajos" }}
      />

      <div className="mt-4 flex flex-col gap-6 pb-8 lg:mt-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {/* Descripción completa */}
          <p className="text-[17px] leading-[1.45] whitespace-pre-line text-texto">
            {trabajo.descripcion}
          </p>

          {/* Barrio, distancia y urgencia (boceto App-TrabajoDetalle) */}
          <dl className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-superficie px-3 py-2.5">
              <dt className="text-sm text-texto">Barrio</dt>
              <dd className="font-bold text-texto">{trabajo.barrioNombre}</dd>
            </div>
            {distanciaNumero ? (
              <div className="rounded-xl bg-superficie px-3 py-2.5">
                <dt className="text-sm text-texto">Distancia</dt>
                <dd className="font-bold text-texto tabular-nums">{distanciaNumero}</dd>
              </div>
            ) : null}
            <div className="rounded-xl bg-superficie px-3 py-2.5">
              <dt className="text-sm text-texto">Para</dt>
              <dd aria-label={ETIQUETA_URGENCIA[trabajo.urgencia]} className="font-bold text-texto">
                {ETIQUETA_PARA[trabajo.urgencia]}
              </dd>
            </div>
          </dl>

          {/* Fotos del cliente en grilla de 2 (tocar = visor) */}
          {trabajo.fotos.length > 0 ? (
            <GaleriaFotosTrabajo fotos={trabajo.fotos} tituloTrabajo={trabajo.titulo} />
          ) : null}

          {/* Presupuesto estimado si lo puso */}
          {trabajo.presupuestoEstimado !== null ? (
            <div className="rounded-xl bg-superficie p-3.5 text-sm font-bold text-texto">
              El cliente estima {formatearPesos(trabajo.presupuestoEstimado)}
            </div>
          ) : null}

          {/* Línea de quién publicó el trabajo */}
          <p className="text-[15px] text-texto">
            Lo publicó <strong>{clienteNombreVisible}</strong> · La dirección se comparte al
            acordar.
          </p>
        </div>

        <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-6 lg:w-[380px] lg:shrink-0">
          {/* Formulario de postulación o estado actual */}
          <FormularioPostulacion
            trabajoId={trabajo.id}
            clienteNombre={clienteNombreParaFormulario}
            trabajoEstado={trabajo.estado}
            publicado={perfil?.publicado ?? false}
            miPostulacion={trabajo.miPostulacion}
          />

          {/* Reportar trabajo */}
          <div className="flex justify-center pt-1">
            <BotonReportar
              objetivoTipo="trabajo"
              objetivoId={trabajo.id}
              tituloObjetivo={trabajo.titulo}
              texto="Reportar este trabajo"
            />
          </div>
        </aside>
      </div>
    </>
  );
}
