"use client";

import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import { retirarPostulacion } from "@/lib/trabajos/acciones";

type BotonRetirarPostulacionProps = {
  postulacionId: string;
};

/**
 * Botón con confirmación para retirar una postulación mientras está en estado 'enviada' (LAB-27, LAB-78).
 */
export function BotonRetirarPostulacion({ postulacionId }: BotonRetirarPostulacionProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function manejarRetiro() {
    setError(null);
    startTransition(async () => {
      const res = await retirarPostulacion(postulacionId);
      if (!res.ok) {
        setError(res.mensaje ?? "No pudimos retirar la postulación.");
        setConfirmando(false);
      }
    });
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-fondo p-3 text-sm">
        <p className="font-bold text-texto">¿Seguro que querés retirar tu postulación?</p>
        {error ? (
          <p role="alert" className="text-xs font-bold text-error">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Boton
            variante="peligro"
            cargando={isPending}
            onClick={manejarRetiro}
            className="min-h-11 px-4 text-sm"
          >
            Sí, retirar
          </Boton>
          <Boton
            variante="secundario"
            disabled={isPending}
            onClick={() => {
              setConfirmando(false);
              setError(null);
            }}
            className="min-h-11 px-4 text-sm"
          >
            Cancelar
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {error ? (
        <p role="alert" className="text-xs font-bold text-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex min-h-11 items-center rounded px-0 text-[15px] font-bold text-error underline decoration-2 underline-offset-4"
      >
        Retirar mi postulación
      </button>
    </div>
  );
}
