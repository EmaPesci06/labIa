"use client";

import Link from "next/link";
import { useState } from "react";

import { Tarjeta } from "@/components/ui/Tarjeta";
import { haceCuanto } from "@/lib/formato";
import type { FilaReporteAdmin } from "@/lib/admin/reportes-datos";

import { BotonAccionModeracion } from "./BotonAccionModeracion";
import { ModalSuspender } from "./ModalSuspender";

const ESTILO_ESTADO = {
  abierto: "bg-naranja-suave text-sobre-naranja-suave",
  en_revision: "bg-azul-suave text-sobre-azul-suave",
  resuelto: "bg-exito-suave text-sobre-exito-suave",
} as const;

const TEXTO_ESTADO = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto: "Resuelto",
} as const;

export function FilaReporte({ fila }: { fila: FilaReporteAdmin }) {
  const [modalSuspenderAbierto, setModalSuspenderAbierto] = useState(false);

  return (
    <Tarjeta borde className="flex flex-col gap-4">
      {/* Cabecera del reporte */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-superficie px-3 py-1 font-mono text-xs font-bold tracking-wider text-texto-secundario uppercase">
            {fila.objetivoTipo}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTILO_ESTADO[fila.estado]}`}
          >
            {TEXTO_ESTADO[fila.estado]}
          </span>
          {fila.conteoAcumulado > 1 ? (
            <span className="rounded-full bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
              {fila.conteoAcumulado} reportes acumulados
            </span>
          ) : null}
        </div>
        <span className="text-xs font-medium text-texto-secundario">
          {haceCuanto(fila.createdAt)}
        </span>
      </div>

      {/* Detalle y motivo */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold text-texto-secundario">Motivo:</span>
          <span className="font-bold text-texto">{fila.motivoTexto}</span>
        </div>

        {fila.detalle ? (
          <div className="rounded-[12px] bg-superficie p-3 text-sm text-texto">
            <span className="font-semibold text-texto-secundario">Detalle del usuario: </span>
            {fila.detalle}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-texto-secundario">
          <p>
            Reportado por: <span className="font-medium text-texto">{fila.autorNombre}</span>
          </p>
          <p>
            Objetivo:{" "}
            <Link
              href={fila.objetivoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-azul hover:underline"
            >
              {fila.objetivoTitulo} ↗
            </Link>
          </p>
        </div>

        {fila.usuarioAfectadoId && fila.usuarioAfectadoNombre ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-texto-secundario">
            <span>Usuario objetivo:</span>
            <span className="font-bold text-texto">{fila.usuarioAfectadoNombre}</span>
            {fila.usuarioAfectadoEstado === "suspendida" ? (
              <span className="rounded-full bg-error/15 px-2 py-0.5 text-xs font-bold text-error">
                Cuenta suspendida
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Acciones de moderación */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divisor pt-3">
        {/* Acciones sobre el objetivo */}
        <div className="flex flex-wrap items-center gap-2">
          {fila.usuarioAfectadoId && fila.usuarioAfectadoNombre ? (
            fila.usuarioAfectadoEstado === "suspendida" ? (
              <BotonAccionModeracion
                accion={{ tipo: "reactivar_cuenta", usuarioId: fila.usuarioAfectadoId }}
                etiqueta="Reactivar cuenta"
                variante="secundario"
              />
            ) : (
              <button
                type="button"
                onClick={() => setModalSuspenderAbierto(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-boton bg-error/10 px-4 text-sm font-bold text-error hover:bg-error/20 active:opacity-80"
              >
                Suspender cuenta…
              </button>
            )
          ) : null}

          {fila.objetivoTipo === "trabajo" ? (
            <BotonAccionModeracion
              accion={{ tipo: "cerrar_trabajo", trabajoId: fila.objetivoId }}
              etiqueta="Cerrar trabajo"
              variante="secundario"
            />
          ) : null}

          {fila.objetivoTipo === "resena" ? (
            <BotonAccionModeracion
              accion={{ tipo: "ocultar_resena", resenaId: fila.objetivoId }}
              etiqueta="Ocultar reseña"
              variante="secundario"
            />
          ) : null}
        </div>

        {/* Acciones sobre el reporte */}
        <div className="flex flex-wrap items-center gap-2">
          {fila.estado === "abierto" ? (
            <BotonAccionModeracion
              accion={{ tipo: "marcar_en_revision", reporteId: fila.id }}
              etiqueta="Marcar en revisión"
              variante="secundario"
            />
          ) : null}

          {fila.estado !== "resuelto" ? (
            <>
              <BotonAccionModeracion
                accion={{
                  tipo: "resolver",
                  reporteId: fila.id,
                  resolucion: "accion_tomada",
                }}
                etiqueta="Resolver con acción"
                variante="cliente"
              />
              <BotonAccionModeracion
                accion={{
                  tipo: "resolver",
                  reporteId: fila.id,
                  resolucion: "desestimado",
                }}
                etiqueta="Desestimar"
                variante="fantasma"
              />
            </>
          ) : null}
        </div>
      </div>

      {fila.usuarioAfectadoId && fila.usuarioAfectadoNombre ? (
        <ModalSuspender
          abierta={modalSuspenderAbierto}
          onCambioAbierta={setModalSuspenderAbierto}
          usuarioId={fila.usuarioAfectadoId}
          nombreUsuario={fila.usuarioAfectadoNombre}
        />
      ) : null}
    </Tarjeta>
  );
}
