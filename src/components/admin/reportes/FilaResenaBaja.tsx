"use client";

import Link from "next/link";
import { useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { haceCuanto } from "@/lib/formato";
import type { FilaResenaBajaAdmin } from "@/lib/admin/reportes-datos";

import { BotonAccionModeracion } from "./BotonAccionModeracion";
import { ModalSuspender } from "./ModalSuspender";

export function FilaResenaBaja({ fila }: { fila: FilaResenaBajaAdmin }) {
  const [modalSuspenderAbierto, setModalSuspenderAbierto] = useState(false);

  return (
    <Tarjeta className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-error bg-superficie px-2.5 py-1 text-xs font-bold text-error">
            ★ {fila.puntaje} / 5
          </span>
          {fila.reportada ? (
            <span className="rounded-full bg-sol px-2.5 py-1 text-xs font-bold text-sobre-sol">
              Reportada
            </span>
          ) : null}
        </div>
        <span className="text-xs font-medium text-texto">{haceCuanto(fila.createdAt)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-texto">
          Por <span className="font-semibold text-texto">{fila.autorNombre}</span> para{" "}
          <Link
            href={`/profesionales/${fila.profesionalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-texto hover:underline"
          >
            {fila.profesionalNombre} ↗
          </Link>
        </p>

        {fila.texto ? (
          <p className="rounded-[12px] bg-superficie p-3 text-sm text-texto italic">
            &ldquo;{fila.texto}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-texto italic">Sin comentario escrito.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-fondo pt-3">
        {fila.autorId ? (
          <Boton type="button" variante="peligro" onClick={() => setModalSuspenderAbierto(true)}>
            Suspender cliente…
          </Boton>
        ) : null}

        <BotonAccionModeracion
          accion={{ tipo: "ocultar_resena", resenaId: fila.id }}
          etiqueta="Ocultar reseña"
          variante="secundario"
        />
      </div>

      {fila.autorId ? (
        <ModalSuspender
          abierta={modalSuspenderAbierto}
          onCambioAbierta={setModalSuspenderAbierto}
          usuarioId={fila.autorId}
          nombreUsuario={fila.autorNombre}
        />
      ) : null}
    </Tarjeta>
  );
}
