"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { HojaInferior } from "@/components/ui/HojaInferior";
import { cn } from "@/lib/cn";
import { registrarEvento } from "@/lib/metricas";
import { enviarReporte } from "@/lib/reportes/acciones";
import { ESTADO_REPORTE_INICIAL, type EstadoReporteForm } from "@/lib/reportes/estado";
import {
  ETIQUETAS_MOTIVO,
  MAX_CARACTERES_DETALLE,
  MOTIVOS_REPORTE,
  type MotivoReporte,
  type TipoObjetivo,
} from "@/lib/validaciones/reportes";

type Props = {
  abierta: boolean;
  onCambioAbierta: (abierta: boolean) => void;
  objetivoTipo: TipoObjetivo;
  objetivoId: string;
  /** Nombre o descripción breve del objetivo reportado */
  tituloObjetivo?: string;
  /** Elemento al que vuelve el foco al cerrar */
  devolverFocoA?: { current: HTMLElement | null };
  /** Si el usuario no tiene sesión iniciada */
  estaAutenticado?: boolean;
  /** URL de ingreso para redireccionar si no tiene sesión */
  hrefIngreso?: string;
};

export function HojaReportar({
  abierta,
  onCambioAbierta,
  objetivoTipo,
  objetivoId,
  tituloObjetivo,
  devolverFocoA,
  estaAutenticado = true,
  hrefIngreso,
}: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoReporteForm, FormData>(
    enviarReporte,
    ESTADO_REPORTE_INICIAL,
  );

  const [motivoSeleccionado, setMotivoSeleccionado] = useState<MotivoReporte | "">("");
  const [detalle, setDetalle] = useState("");
  const idBase = useId();

  const handleCambioAbierta = (nuevaAbierta: boolean) => {
    if (!nuevaAbierta) {
      setMotivoSeleccionado("");
      setDetalle("");
    }
    onCambioAbierta(nuevaAbierta);
  };

  // Al reabrir la hoja tras enviar, se sigue mostrando "Reporte enviado" a propósito: el servidor
  // acepta un solo reporte por autor y objetivo, así que el formulario solo llevaría a "Ya enviaste...".

  // Si se envió exitosamente, registrar métrica en cliente
  useEffect(() => {
    if (estado.exito && estado.motivoEnviado) {
      registrarEvento("reporte_enviado", { motivo: estado.motivoEnviado });
    }
  }, [estado.exito, estado.motivoEnviado]);

  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={handleCambioAbierta}
      titulo={estado.exito ? "Reporte enviado" : "¿Qué pasó?"}
      devolverFocoA={devolverFocoA}
    >
      {!estaAutenticado ? (
        <div className="flex flex-col gap-4 py-1">
          <p className="text-[15px] leading-relaxed text-texto-secundario">
            Para reportar un {objetivoTipo === "resena" ? "comentario" : objetivoTipo} necesitás
            iniciar sesión en tu cuenta de LabÍA.
          </p>
          <Boton href={hrefIngreso ?? "/ingresar"} variante="cliente" tamano="grande" bloque>
            Ingresar a mi cuenta
          </Boton>
        </div>
      ) : estado.exito ? (
        <div className="flex flex-col gap-4 py-1">
          <div className="flex items-start gap-3 rounded-2xl bg-superficie p-4 text-texto">
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-sobre-azul-suave" />
            <div className="flex flex-col gap-1 text-[15px] leading-relaxed">
              <p className="font-semibold text-texto">Gracias por avisarnos.</p>
              <p className="text-texto-secundario">
                Lo revisamos y, si hace falta, tomamos medidas. No le avisamos a la otra persona que
                la reportaste.
              </p>
            </div>
          </div>
          <Boton variante="cliente" tamano="grande" onClick={() => onCambioAbierta(false)} bloque>
            Entendido
          </Boton>
        </div>
      ) : (
        <form action={accion} className="flex flex-col gap-4">
          <input type="hidden" name="objetivoTipo" value={objetivoTipo} />
          <input type="hidden" name="objetivoId" value={objetivoId} />

          {tituloObjetivo ? (
            <p className="text-sm font-semibold text-texto-secundario">
              Reportando: <span className="text-texto">{tituloObjetivo}</span>
            </p>
          ) : null}

          {/* Aviso de emergencia cuando el motivo es comportamiento */}
          {motivoSeleccionado === "comportamiento" ? (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-[14px] border border-naranja-suave bg-naranja-suave/40 p-3.5 text-sm font-bold text-sobre-naranja-suave"
            >
              <AlertTriangle aria-hidden className="size-5 shrink-0 text-error" />
              <span>Si estás en peligro, llamá al 911.</span>
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold text-texto">
              Seleccioná el motivo del reporte
            </legend>
            {MOTIVOS_REPORTE.map((motivo) => {
              const inputId = `${idBase}-${motivo}`;
              const seleccionado = motivoSeleccionado === motivo;
              return (
                <label
                  key={motivo}
                  htmlFor={inputId}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-campo border p-3.5 transition-colors",
                    seleccionado
                      ? "border-borde-fuerte bg-azul-suave/30"
                      : "border-borde hover:bg-superficie",
                  )}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="motivo"
                    value={motivo}
                    checked={seleccionado}
                    onChange={() => setMotivoSeleccionado(motivo)}
                    className="mt-0.5 size-4 text-azul focus:ring-foco"
                  />
                  <span className="text-[15px] leading-snug font-medium text-texto">
                    {ETIQUETAS_MOTIVO[motivo]}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {estado.errores?.motivo ? (
            <p role="alert" className="text-sm font-semibold text-error">
              {estado.errores.motivo}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idBase}-detalle`} className="text-sm font-bold text-texto">
              Detalle opcional
            </label>
            <textarea
              id={`${idBase}-detalle`}
              name="detalle"
              rows={3}
              maxLength={MAX_CARACTERES_DETALLE}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Contanos qué pasó con el mayor detalle posible..."
              className="focus:border-borde-fuerte w-full rounded-campo border border-borde bg-superficie p-3 text-[15px] text-texto placeholder:text-texto-terciario focus:ring-2 focus:ring-foco focus:outline-none"
            />
            <div className="flex justify-end text-xs text-texto-secundario">
              <span>
                {detalle.length} / {MAX_CARACTERES_DETALLE}
              </span>
            </div>
            {estado.errores?.detalle ? (
              <p role="alert" className="text-sm font-semibold text-error">
                {estado.errores.detalle}
              </p>
            ) : null}
          </div>

          {estado.mensaje ? (
            <div
              role="alert"
              className="rounded-campo bg-naranja-suave/60 p-3 text-sm font-semibold text-sobre-naranja-suave"
            >
              {estado.mensaje}
            </div>
          ) : null}

          <Boton
            type="submit"
            variante="cliente"
            tamano="grande"
            cargando={pendiente}
            disabled={!motivoSeleccionado || pendiente}
            bloque
          >
            Enviar reporte
          </Boton>
        </form>
      )}
    </HojaInferior>
  );
}
