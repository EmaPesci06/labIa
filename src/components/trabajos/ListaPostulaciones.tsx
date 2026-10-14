import Link from "next/link";
import { Briefcase } from "lucide-react";

import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Vacio } from "@/components/ui/Vacio";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import type { PostulacionItem } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

import { BotonRetirarPostulacion } from "./BotonRetirarPostulacion";

type ListaPostulacionesProps = {
  postulaciones: PostulacionItem[];
};

/**
 * Lista de postulaciones del profesional para /trabajos?vista=mias (LAB-27).
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
    <div className="flex flex-col gap-4">
      {postulaciones.map((p) => {
        const cuando = haceCuanto(p.createdAt);
        const trabajo = p.trabajo;
        const tituloTrabajo = trabajo?.titulo ?? "Trabajo";
        const barrioTrabajo = trabajo?.barrioNombre ?? "Mar del Plata";
        const oficioEtiqueta = trabajo
          ? (ETIQUETA_OFICIO[trabajo.oficio] ?? trabajo.oficio)
          : "Oficio";

        return (
          <Tarjeta key={p.id} borde className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <EtiquetaMono partes={[oficioEtiqueta, barrioTrabajo]} />
              <span className="shrink-0 text-sm text-texto-secundario">{cuando}</span>
            </div>

            <div>
              <Link
                href={`/trabajos/${p.trabajoId}`}
                className="rounded text-[17px] leading-snug font-bold text-texto hover:underline focus-visible:ring-2 focus-visible:ring-naranja-accion focus-visible:outline-none"
              >
                {tituloTrabajo}
              </Link>
            </div>

            {p.mensaje ? (
              <p className="line-clamp-2 text-[15px] leading-snug text-texto-secundario">
                &ldquo;{p.mensaje}&rdquo;
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-texto-secundario">
              {p.precioEstimado ? (
                <span>
                  Presupuesto:{" "}
                  <strong className="text-texto">{formatearPesos(p.precioEstimado)}</strong>
                </span>
              ) : null}
              {p.senaPropuesta ? (
                <span>
                  Seña propuesta:{" "}
                  <strong className="text-texto">{formatearPesos(p.senaPropuesta)}</strong>
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divisor pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {p.estado === "enviada" ? <Insignia variante="verificada">Enviada</Insignia> : null}
                {p.estado === "elegida" ? (
                  <div className="flex flex-col gap-0.5">
                    <Insignia variante="exito">¡Te eligieron!</Insignia>
                    <span className="text-xs font-semibold text-sobre-exito-suave">
                      El cliente te va a escribir por WhatsApp.
                    </span>
                  </div>
                ) : null}
                {p.estado === "descartada" ? (
                  <span className="inline-flex items-center rounded-full bg-superficie-elevada px-2.5 py-1 text-xs font-bold text-texto-secundario">
                    Eligieron a otro profesional
                  </span>
                ) : null}
                {p.estado === "retirada" ? (
                  <span className="inline-flex items-center rounded-full bg-superficie-elevada px-2.5 py-1 text-xs font-bold text-texto-secundario">
                    Retirada
                  </span>
                ) : null}

                {trabajo?.urgencia ? (
                  <Insignia
                    variante={trabajo.urgencia === "lo_antes_posible" ? "urgencia" : "verificada"}
                  >
                    {ETIQUETA_URGENCIA[trabajo.urgencia]}
                  </Insignia>
                ) : null}
              </div>

              {p.estado === "enviada" ? <BotonRetirarPostulacion postulacionId={p.id} /> : null}
            </div>
          </Tarjeta>
        );
      })}
    </div>
  );
}
