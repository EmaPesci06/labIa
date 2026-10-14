"use client";

import { useActionState, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { VERSION_NORMAS } from "@/lib/normas";
import { aceptarNormas } from "@/lib/registro/normas";
import { MENSAJE_ACEPTAR_NORMAS } from "@/lib/validaciones/normas";

/**
 * Casilla "Leí y acepto" + botón. Sin tildar el botón queda deshabilitado (aria-disabled, para que
 * siga recibiendo el toque) y al tocarlo muestra "Aceptá las normas para seguir".
 */
export function FormularioNormas({
  textoBoton,
  className,
}: {
  textoBoton: string;
  className?: string;
}) {
  const [estado, despachar, pendiente] = useActionState(aceptarNormas, {});
  const [acepto, setAcepto] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  const mensaje = ayuda && !acepto ? MENSAJE_ACEPTAR_NORMAS : (estado.mensaje ?? null);

  return (
    <form action={despachar} noValidate className={className ?? "flex flex-col gap-3"}>
      <input type="hidden" name="version" value={VERSION_NORMAS} />
      <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-borde bg-superficie px-3.5 py-2 text-[15px] font-semibold">
        <input
          type="checkbox"
          name="acepto"
          checked={acepto}
          onChange={(e) => {
            setAcepto(e.target.checked);
            if (e.target.checked) setAyuda(false);
          }}
          aria-describedby="ayuda-normas"
          className="size-[22px] flex-none accent-azul"
        />
        Leí y acepto las normas de LabÍA
      </label>

      <Boton
        type="submit"
        variante="profesional"
        tamano="grande"
        bloque
        cargando={pendiente}
        aria-disabled={!acepto}
        className={
          acepto ? undefined : "bg-divisor text-texto-secundario hover:bg-divisor active:bg-divisor"
        }
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
        className="text-center text-sm font-semibold text-error empty:hidden"
      >
        {mensaje}
      </p>
    </form>
  );
}
