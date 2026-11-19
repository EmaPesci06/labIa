import type { ReactNode } from "react";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { cn } from "@/lib/cn";

import { EncabezadoRegistro } from "./EncabezadoRegistro";

type Props = {
  paso: 1 | 2 | 3;
  titulo: string;
  descripcion: string;
  ancho?: "formulario" | "lectura";
  tituloChico?: boolean;
  children: ReactNode;
};

/**
 * Estructura del registro profesional: enlace para saltar al contenido, encabezado amarillo con los
 * tres pasos y columna centrada (560 px para formularios, 720 px para lectura de normas).
 */
export function EstructuraRegistro({
  paso,
  titulo,
  descripcion,
  ancho = "formulario",
  tituloChico = false,
  children,
}: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <SaltarAlContenido />
      <EncabezadoRegistro
        paso={paso}
        titulo={titulo}
        descripcion={descripcion}
        ancho={ancho}
        tituloChico={tituloChico}
      />
      <main
        id="contenido"
        tabIndex={-1}
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5 pt-3.5 pb-6 focus:outline-none lg:px-8 lg:py-8",
          ancho === "lectura" ? "max-w-[720px]" : "max-w-[560px]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
