"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "children">;

/**
 * Campo de contraseña con botón "Ver" / "Ocultar" al lado (boceto `App-Ingresar`).
 * Asocia ayuda y error con `aria-describedby` y marca `aria-invalid` cuando hay error.
 */
export function CampoContrasena({
  etiqueta,
  ayuda,
  error,
  className,
  id: idProp,
  "aria-describedby": ariaDescribedByProp,
  ...entrada
}: Props) {
  const idGenerado = useId();
  const id = idProp ?? idGenerado;
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const [visible, setVisible] = useState(false);

  const describedBy =
    [error ? idError : undefined, ayuda ? idAyuda : undefined, ariaDescribedByProp]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-base font-bold text-texto">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <input
          {...entrada}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-[52px] min-w-0 flex-1 rounded-xl border-2 border-texto bg-campo px-3.5 text-[17px] text-texto placeholder:text-texto placeholder:opacity-60 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-3 aria-invalid:border-error"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
          className="min-h-[52px] rounded-xl border-2 border-texto bg-transparent px-3.5 text-[15px] font-bold text-texto hover:bg-superficie"
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {error ? (
        <p id={idError} className="text-[15px] font-bold text-error">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-sm text-texto">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}
