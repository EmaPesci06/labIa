"use client";

import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { decidirVerificacion } from "@/lib/verificacion/acciones";
import { MOTIVOS_RECHAZO } from "@/lib/validaciones/verificacion";

/**
 * Aprobar o rechazar un documento pendiente. Rechazar pide un motivo de la lista y, opcionalmente,
 * un texto (obligatorio con "Otro"). Los errores salen junto al campo.
 */
export function FormularioDecision({ verificacionId }: { verificacionId: string }) {
  const [estado, accion, pendiente] = useActionState(decidirVerificacion, ESTADO_INICIAL);
  const [rechazando, setRechazando] = useState(false);

  return (
    <form action={accion} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="verificacionId" value={verificacionId} />

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Boton
          type="submit"
          name="accion"
          value="aprobar"
          variante="cliente"
          cargando={pendiente}
          className="sm:flex-1"
          bloque
        >
          Aprobar
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          aria-expanded={rechazando}
          aria-controls="panel-rechazo"
          onClick={() => setRechazando((r) => !r)}
          className="sm:flex-1"
          bloque
        >
          Rechazar…
        </Boton>
      </div>

      {rechazando ? (
        <div
          id="panel-rechazo"
          className="flex flex-col gap-3 rounded-[14px] border border-divisor p-3.5"
        >
          <Campo
            variante="seleccion"
            etiqueta="Motivo del rechazo"
            name="motivo"
            defaultValue=""
            required
            error={estado.errores?.motivo}
          >
            <option value="" disabled>
              Elegí un motivo
            </option>
            {MOTIVOS_RECHAZO.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </Campo>
          <Campo
            variante="area"
            etiqueta="Detalle (opcional; obligatorio con Otro)"
            name="detalle"
            maxLength={300}
            error={estado.errores?.detalle}
          />
          <button
            type="submit"
            name="accion"
            value="rechazar"
            aria-busy={pendiente || undefined}
            className="inline-flex min-h-[52px] items-center justify-center rounded-boton bg-error px-5 text-base font-bold text-sobre-azul hover:opacity-90 active:opacity-80 disabled:opacity-50 aria-busy:pointer-events-none"
          >
            {pendiente ? "Guardando…" : "Confirmar rechazo"}
          </button>
        </div>
      ) : null}

      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-semibold text-exito">
          {estado.exito}
        </p>
      ) : null}
    </form>
  );
}
