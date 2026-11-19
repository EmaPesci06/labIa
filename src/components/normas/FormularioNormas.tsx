"use client";

import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/cn";
import { VERSION_NORMAS } from "@/lib/normas";
import { aceptarNormas } from "@/lib/registro/normas";
import { MENSAJE_ACEPTAR_NORMAS } from "@/lib/validaciones/normas";

/**
 * Casilla de aceptación + botón principal (`App-ProNormas`). Sin tildar el botón queda con
 * `aria-disabled` (para que siga recibiendo el toque) y al tocarlo muestra
 * "Aceptá las normas para seguir".
 */
export function FormularioNormas({
  textoBoton,
  etiquetaCasilla = "Leí las diez y me comprometo a cumplirlas",
  className,
}: {
  textoBoton: string;
  etiquetaCasilla?: string;
  className?: string;
}) {
  const [estado, despachar, pendiente] = useActionState(aceptarNormas, {});
  const [acepto, setAcepto] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  const mensaje = ayuda && !acepto ? MENSAJE_ACEPTAR_NORMAS : (estado.mensaje ?? null);

  return (
    <form action={despachar} noValidate className={cn("flex flex-col gap-2.5", className)}>
      <input type="hidden" name="version" value={VERSION_NORMAS} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-bold text-texto">
        <input
          type="checkbox"
          name="acepto"
          checked={acepto}
          onChange={(e) => {
            setAcepto(e.target.checked);
            if (e.target.checked) setAyuda(false);
          }}
          aria-describedby="ayuda-normas"
          className="size-6 flex-none accent-accion"
        />
        <span>{etiquetaCasilla}</span>
      </label>

      <Boton
        type="submit"
        tamano="grande"
        bloque
        cargando={pendiente}
        aria-disabled={!acepto}
        onClick={(e) => {
          if (!acepto) {
            e.preventDefault();
            setAyuda(true);
          }
        }}
      >
        {textoBoton}
      </Boton>

      <p
        id="ayuda-normas"
        role="status"
        className="text-center text-[15px] font-bold text-error empty:hidden"
      >
        {mensaje}
      </p>
    </form>
  );
}
