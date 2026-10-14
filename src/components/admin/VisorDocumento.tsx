"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import { pedirVisorDocumento, type ResultadoVisor } from "@/lib/verificacion/acciones";

type Visible = Extract<ResultadoVisor, { ok: true }>;

/**
 * Visor de un documento. La URL firmada (60 s) se pide al tocar "Ver documento", no antes: nunca
 * queda en el HTML inicial. Pasado el plazo se ofrece "Recargar".
 */
export function VisorDocumento({
  verificacionId,
  etiqueta,
}: {
  verificacionId: string;
  etiqueta: string;
}) {
  const [visor, setVisor] = useState<Visible | null>(null);
  const [vencido, setVencido] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, iniciarCarga] = useTransition();
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function cargar() {
    setError(null);
    iniciarCarga(async () => {
      const resultado = await pedirVisorDocumento(verificacionId);
      window.clearTimeout(temporizador.current);
      if (!resultado.ok) {
        setVisor(null);
        setError(resultado.mensaje);
        return;
      }
      setVencido(false);
      setAmpliado(false);
      setVisor(resultado);
      temporizador.current = window.setTimeout(
        () => setVencido(true),
        Math.max(Date.parse(resultado.expiraEn) - Date.now(), 0),
      );
    });
  }

  if (!visor) {
    return (
      <div className="flex flex-col gap-2">
        <Boton variante="secundario" onClick={cargar} cargando={cargando} className="self-start">
          Ver documento
        </Boton>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (vencido) {
    return (
      <div role="status" className="flex flex-col items-start gap-2">
        <p className="text-sm text-texto-secundario">
          El enlace venció (dura 60 segundos). Recargalo para seguir viendo el documento.
        </p>
        <Boton variante="secundario" onClick={cargar} cargando={cargando}>
          Recargar
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-texto-secundario">Enlace válido por 60 segundos.</p>
        <div className="flex gap-2">
          {visor.formato === "imagen" ? (
            <Boton
              variante="fantasma"
              onClick={() => setAmpliado((a) => !a)}
              aria-pressed={ampliado}
            >
              {ampliado ? "Reducir" : "Ampliar"}
            </Boton>
          ) : null}
          <Boton variante="fantasma" onClick={() => setVisor(null)}>
            Ocultar
          </Boton>
        </div>
      </div>
      {visor.formato === "imagen" ? (
        <div className={ampliado ? "max-h-[70vh] overflow-auto rounded-[14px]" : "rounded-[14px]"}>
          <Image
            src={visor.url}
            alt={`Documento: ${etiqueta}`}
            width={1200}
            height={1600}
            unoptimized
            className={ampliado ? "h-auto w-[160%] max-w-none" : "h-auto w-full"}
          />
        </div>
      ) : (
        <iframe
          src={visor.url}
          title={`Documento: ${etiqueta}`}
          className="h-[70vh] w-full rounded-[14px] border border-divisor bg-superficie"
        />
      )}
    </div>
  );
}
