"use client";

import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import { retirarPostulacion } from "@/lib/trabajos/acciones";

type BotonRetirarPostulacionProps = {
  postulacionId: string;
};

/**
 * Botón con confirmación para retirar una postulación mientras está en estado 'enviada' (LAB-27).
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
      <div className="flex flex-col gap-2 rounded-xl bg-superficie-elevada p-3 text-sm">
        <p className="font-semibold text-texto">¿Seguro que querés retirar tu postulación?</p>
        {error ? <p className="text-xs text-error">{error}</p> : null}
        <div className="flex items-center gap-2">
          <Boton
            variante="secundario"
            cargando={isPending}
            onClick={manejarRetiro}
            className="h-9 px-3 text-xs text-error hover:border-error"
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
            className="h-9 px-3 text-xs"
          >
            Cancelar
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {error ? <p className="text-xs text-error">{error}</p> : null}
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded text-xs font-semibold text-texto-secundario underline underline-offset-2 hover:text-error focus-visible:ring-2 focus-visible:ring-naranja-accion focus-visible:outline-none"
      >
        Retirar postulación
      </button>
    </div>
  );
}
