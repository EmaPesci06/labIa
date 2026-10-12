"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

import { Campo } from "@/components/ui/Campo";

type Props = {
  etiqueta: string;
  ayuda?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "children">;

/** Campo de contraseña con botón para mostrar u ocultar lo escrito. */
export function CampoContrasena(props: Props) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? EyeOff : Eye;
  return (
    <Campo
      {...props}
      type={visible ? "text" : "password"}
      adorno={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="flex size-11 items-center justify-center rounded-campo text-texto-secundario hover:bg-azul-suave"
        >
          <Icono aria-hidden strokeWidth={2} className="size-5" />
        </button>
      }
    />
  );
}
