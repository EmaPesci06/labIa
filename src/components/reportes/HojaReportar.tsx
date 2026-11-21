"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group";
import { Boton } from "@/components/ui/Boton";
import { Hoja } from "@/components/ui/Hoja";
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
    <Hoja
      abierta={abierta}
      onCambioAbierta={handleCambioAbierta}
      titulo={
        estado.exito
          ? "Reporte enviado"
          : objetivoTipo === "perfil"
            ? "¿Qué pasó con este perfil?"
            : "¿Qué pasó?"
      }
      devolverFocoA={devolverFocoA}
    >
      {!estaAutenticado ? (
        <div className="flex flex-col gap-4 py-1">
          <p className="text-[15px] leading-relaxed text-texto">
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
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-texto" />
            <div className="flex flex-col gap-1 text-[15px] leading-relaxed">
              <p className="font-semibold text-texto">Gracias por avisarnos.</p>
              <p className="text-texto">
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
            <p className="text-sm font-semibold text-texto">
              Reportando: <span className="text-texto">{tituloObjetivo}</span>
            </p>
          ) : null}

          {/* Aviso de emergencia cuando el motivo es comportamiento */}
          {motivoSeleccionado === "comportamiento" ? (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-[14px] bg-sol p-3.5 text-sm font-bold text-sobre-sol"
            >
              <AlertTriangle aria-hidden className="size-5 shrink-0 text-error" />
              <span>Si estás en peligro, llamá al 911.</span>
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold text-texto">Elegí el motivo</legend>
            <RadioGroup
              name="motivo"
              value={motivoSeleccionado}
              onValueChange={(valor) => setMotivoSeleccionado(valor as MotivoReporte)}
              aria-describedby={estado.errores?.motivo ? `${idBase}-error-motivo` : undefined}
              aria-invalid={estado.errores?.motivo ? true : undefined}
              className="gap-2"
            >
              {MOTIVOS_REPORTE.map((motivo) => {
                const inputId = `${idBase}-${motivo}`;
                const textoId = `${inputId}-texto`;
                const seleccionado = motivoSeleccionado === motivo;
                return (
                  <label
                    key={motivo}
                    htmlFor={inputId}
                    className={cn(
                      "flex min-h-[50px] cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[17px]",
                      seleccionado ? "bg-sol font-bold text-sobre-sol" : "bg-superficie text-texto",
                    )}
                  >
                    <RadioGroupItem
                      id={inputId}
                      value={motivo}
                      aria-labelledby={textoId}
                      className={cn(
                        "size-[22px] shrink-0 border-2",
                        seleccionado
                          ? "border-sobre-sol bg-campo data-checked:border-sobre-sol! data-checked:bg-sobre-sol! [&_[data-slot=radio-group-indicator]>span]:bg-sol"
                          : "border-texto bg-campo",
                      )}
                    />
                    <span
                      id={textoId}
                      className={cn(
                        "text-[15px] leading-snug font-medium",
                        seleccionado ? "text-sobre-sol" : "text-texto",
                      )}
                    >
                      {ETIQUETAS_MOTIVO[motivo]}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </fieldset>

          {estado.errores?.motivo ? (
            <p
              id={`${idBase}-error-motivo`}
              role="alert"
              className="text-sm font-semibold text-error"
            >
              {estado.errores.motivo}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idBase}-detalle`} className="text-base font-bold text-texto">
              Contanos qué pasó
            </label>
            <textarea
              id={`${idBase}-detalle`}
              name="detalle"
              rows={3}
              maxLength={MAX_CARACTERES_DETALLE}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              aria-describedby={`${idBase}-ayuda`}
              placeholder="Contanos qué pasó con el mayor detalle posible..."
              className="w-full resize-none rounded-xl border-2 border-texto bg-superficie p-3 text-[17px] leading-snug text-texto placeholder:text-texto/70"
            />
            <p id={`${idBase}-ayuda`} className="text-sm text-texto">
              Lo lee nuestro equipo. La otra persona no ve quién reportó.
            </p>
            <div className="flex justify-end text-xs text-texto">
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
              className="rounded-xl bg-sol/60 p-3 text-sm font-semibold text-sobre-sol"
            >
              {estado.mensaje}
            </div>
          ) : null}

          {/* Azul noche (texto), no turquesa: reportar no es una acción de contacto. */}
          <Boton
            type="submit"
            tamano="grande"
            cargando={pendiente}
            disabled={!motivoSeleccionado || pendiente}
            bloque
            className="bg-texto text-sobre-accion hover:bg-texto/90"
          >
            Enviar reporte
          </Boton>
          <Boton
            type="button"
            variante="enlace"
            className="self-center"
            onClick={() => onCambioAbierta(false)}
          >
            Cancelar
          </Boton>
        </form>
      )}
    </Hoja>
  );
}
