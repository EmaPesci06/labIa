"use client";

import { useActionState } from "react";

import { continuarConGoogle } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { cn } from "@/lib/cn";

type Props = {
  /** Camino elegido al registrarse; se guarda en `user_metadata.rol`. Nunca "admin". */
  rol?: "cliente" | "profesional";
  /** Ruta interna a la que volver después de ingresar. */
  volver?: string;
  className?: string;
};

/** "Seguir con Google" (bocetos `App-Ingresar` y `App-RegistroCliente`). Es un formulario con Server Action. */
export function BotonGoogle({ rol, volver, className }: Props) {
  const [estado, accion, pendiente] = useActionState(continuarConGoogle, ESTADO_INICIAL);
  return (
    <form action={accion} className={cn("flex flex-col gap-2", className)}>
      {rol ? <input type="hidden" name="rol" value={rol} /> : null}
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
      <button
        type="submit"
        aria-busy={pendiente || undefined}
        className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-boton border-2 border-texto bg-superficie px-5 text-[17px] font-bold text-texto hover:opacity-95"
      >
        Seguir con Google
      </button>
      {estado.mensaje ? (
        <p role="alert" className="text-[15px] font-bold text-error">
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

/** Separador "o con tu email" entre Google y el formulario (`App-Ingresar`). */
export function SeparadorO({ texto = "o con tu email" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 text-[15px] text-texto">
      <span aria-hidden className="h-0.5 flex-1 bg-texto" />
      {texto}
      <span aria-hidden className="h-0.5 flex-1 bg-texto" />
    </div>
  );
}
