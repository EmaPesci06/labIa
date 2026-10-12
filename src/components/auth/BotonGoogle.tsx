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

/** "Continuar con Google" (como en el registro del prototipo). Es un formulario con Server Action. */
export function BotonGoogle({ rol, volver, className }: Props) {
  const [estado, accion, pendiente] = useActionState(continuarConGoogle, ESTADO_INICIAL);
  return (
    <form action={accion} className={cn("flex flex-col gap-2", className)}>
      {rol ? <input type="hidden" name="rol" value={rol} /> : null}
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
      <button
        type="submit"
        aria-busy={pendiente || undefined}
        className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-campo border border-borde bg-superficie text-[15px] font-semibold text-texto hover:bg-azul-suave"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12h8" />
        </svg>
        Continuar con Google
      </button>
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}

/** Separador "o con tu email" entre Google y el formulario. */
export function SeparadorO({ texto = "o con tu email" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-texto-terciario">
      <span aria-hidden className="h-px flex-1 bg-divisor" />
      {texto}
      <span aria-hidden className="h-px flex-1 bg-divisor" />
    </div>
  );
}
