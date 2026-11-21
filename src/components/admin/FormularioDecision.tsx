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
          variante="peligro"
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
          className="flex flex-col gap-3 rounded-[14px] border border-fondo p-3.5"
        >
          <Campo
            variante="seleccion"
            etiqueta="Motivo del rechazo"
            name="motivo"
            defaultValue=""
            placeholder="Elegí un motivo"
            opciones={MOTIVOS_RECHAZO.map((motivo) => ({ valor: motivo, etiqueta: motivo }))}
            required
            error={estado.errores?.motivo}
          />
          <Campo
            variante="area"
            etiqueta="Detalle (opcional; obligatorio con Otro)"
            name="detalle"
            maxLength={300}
            error={estado.errores?.detalle}
          />
          <Boton
            type="submit"
            name="accion"
            value="rechazar"
            variante="peligro"
            cargando={pendiente}
            bloque
          >
            {pendiente ? "Guardando…" : "Confirmar rechazo"}
          </Boton>
        </div>
      ) : null}

      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-semibold text-texto">
          {estado.exito}
        </p>
      ) : null}
    </form>
  );
}
