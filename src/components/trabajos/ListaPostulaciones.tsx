import { Briefcase } from "lucide-react";
import Link from "next/link";

import { Tarjeta } from "@/components/ui/Tarjeta";
import { Toldo, type ColorToldo } from "@/components/ui/Toldo";
import { Vacio } from "@/components/ui/Vacio";
import { cn } from "@/lib/cn";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import type { EstadoPostulacion, PostulacionItem } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO } from "@/lib/validaciones/trabajo";

import { BotonRetirarPostulacion } from "./BotonRetirarPostulacion";

type ListaPostulacionesProps = {
  postulaciones: PostulacionItem[];
};

const CONFIG_ESTADO: Record<
  EstadoPostulacion,
  {
    toldo: ColorToldo;
    etiqueta: string;
    clasesPastilla: string;
  }
> = {
  elegida: {
    toldo: "accion",
    etiqueta: "Te eligieron",
    clasesPastilla: "bg-encabezado text-sobre-encabezado",
  },
  enviada: {
    toldo: "destacado",
    etiqueta: "Esperando respuesta",
    clasesPastilla: "bg-destacado text-sobre-destacado",
  },
  descartada: {
    toldo: "texto",
    etiqueta: "Eligieron a otra persona",
    clasesPastilla: "bg-fondo text-texto",
  },
  retirada: {
    toldo: "texto",
    etiqueta: "Retiraste tu postulación",
    clasesPastilla: "bg-fondo text-texto",
  },
};

/**
 * Lista de postulaciones del profesional para /trabajos?vista=mias (LAB-27, LAB-78).
 * Sigue los bocetos App-Postulaciones y Oscuro-Postulaciones: tarjeta con toldo superior
 * según el estado, pastilla de estado, título en Baloo 2 800, resumen y acción.
 */
export function ListaPostulaciones({ postulaciones }: ListaPostulacionesProps) {
  if (postulaciones.length === 0) {
    return (
      <Vacio
        icono={Briefcase}
        titulo="No te postulaste a ningún trabajo todavía"
        descripcion="Explorá los trabajos disponibles y postulate a los que coincidan con tu oficio."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:max-w-[720px]">
      {postulaciones.map((p) => {
        const cuando = haceCuanto(p.createdAt);
        const trabajo = p.trabajo;
        const tituloTrabajo = trabajo?.titulo ?? "Trabajo";
        const barrioTrabajo = trabajo?.barrioNombre ?? "Mar del Plata";
        const oficioEtiqueta = trabajo
          ? (ETIQUETA_OFICIO[trabajo.oficio] ?? trabajo.oficio)
          : "Oficio";
        const nombreCliente = p.cliente?.nombre ?? "El cliente";
        const config = CONFIG_ESTADO[p.estado];

        const resumenSecundario =
          p.estado === "elegida"
            ? `${nombreCliente}, de ${barrioTrabajo}, te va a escribir por WhatsApp.`
            : p.estado === "enviada"
              ? `${oficioEtiqueta} · ${barrioTrabajo} · te postulaste ${cuando}`
              : `${oficioEtiqueta} · ${barrioTrabajo} · ${cuando}`;

        return (
          <Tarjeta key={p.id} como="article" className="flex flex-col overflow-hidden p-0">
            <Toldo color={config.toldo} alto={14} />
            <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
              <span
                className={cn(
                  "self-start rounded-[14px] px-3 py-[5px] text-[15px] font-bold",
                  config.clasesPastilla,
                )}
              >
                {config.etiqueta}
              </span>

              <h2 className="font-titulo text-[22px] leading-[1.1] text-texto">
                <Link
                  href={`/trabajos/${p.trabajoId}`}
                  className="rounded no-underline hover:underline"
                >
                  {tituloTrabajo}
                </Link>
              </h2>

              <span className="text-[15px] text-texto">{resumenSecundario}</span>

              {p.mensaje ? (
                <p className="line-clamp-2 text-[15px] leading-snug text-texto">
                  &ldquo;{p.mensaje}&rdquo;
                </p>
              ) : null}

              {p.precioEstimado !== null || p.senaPropuesta !== null ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-texto">
                  {p.precioEstimado !== null ? (
                    <span>
                      Presupuesto:{" "}
                      <strong className="text-texto">{formatearPesos(p.precioEstimado)}</strong>
                    </span>
                  ) : null}
                  {p.senaPropuesta !== null ? (
                    <span>
                      Seña propuesta:{" "}
                      <strong className="text-texto">{formatearPesos(p.senaPropuesta)}</strong>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {p.estado === "enviada" ? <BotonRetirarPostulacion postulacionId={p.id} /> : null}
            </div>
          </Tarjeta>
        );
      })}
    </div>
  );
}
