"use client";

import { Flag } from "lucide-react";
import { useRef, useState } from "react";

import { HojaReportar } from "./HojaReportar";
import type { TipoObjetivo } from "@/lib/validaciones/reportes";

type Props = {
  objetivoTipo: TipoObjetivo;
  objetivoId: string;
  tituloObjetivo?: string;
  texto?: string;
  className?: string;
  conIcono?: boolean;
  estaAutenticado?: boolean;
  hrefIngreso?: string;
};

export function BotonReportar({
  objetivoTipo,
  objetivoId,
  tituloObjetivo,
  texto = "Reportar",
  className,
  conIcono = false,
  estaAutenticado = true,
  hrefIngreso,
}: Props) {
  const [abierta, setAbierta] = useState(false);
  const botonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierta(true)}
        aria-haspopup="dialog"
        className={
          className ??
          "inline-flex min-h-11 items-center justify-center gap-1.5 text-sm text-texto-terciario underline transition-colors hover:text-texto focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        }
      >
        {conIcono ? <Flag aria-hidden className="size-3.5" /> : null}
        <span>{texto}</span>
      </button>
      <HojaReportar
        abierta={abierta}
        onCambioAbierta={setAbierta}
        objetivoTipo={objetivoTipo}
        objetivoId={objetivoId}
        tituloObjetivo={tituloObjetivo}
        devolverFocoA={botonRef}
        estaAutenticado={estaAutenticado}
        hrefIngreso={hrefIngreso}
      />
    </>
  );
}
