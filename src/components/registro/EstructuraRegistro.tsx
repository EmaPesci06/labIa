import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

export const PASOS_REGISTRO_PROFESIONAL = ["Tu perfil", "Normas"] as const;

/**
 * Estructura del registro de profesional (celular: flecha de volver y pasos; escritorio:
 * cabecera blanca con el logo y los pasos). Es más ancha que las pantallas de `(publico)` porque
 * en escritorio lleva el formulario y la vista previa lado a lado.
 */
export function EstructuraRegistro({ paso, children }: { paso: 1 | 2; children: ReactNode }) {
  return (
    <>
      <SaltarAlContenido />
      <header className="flex items-center justify-between gap-6 px-6 pt-5 lg:border-b lg:border-fondo lg:bg-superficie lg:px-10 lg:py-[18px]">
        <Link
          href={paso === 1 ? "/" : "/registro/profesional"}
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-campo text-texto lg:hidden"
        >
          <ChevronLeft aria-hidden strokeWidth={2} className="size-[22px]" />
        </Link>
        <Link
          href="/"
          aria-label="LabÍA, inicio"
          className="hidden min-h-11 items-center rounded-campo lg:inline-flex"
        >
          <Logo alt="" />
        </Link>
        <div role="group" aria-label={`Paso ${paso} de ${PASOS_REGISTRO_PROFESIONAL.length}`}>
          <ol className="flex items-center gap-1.5 text-sm font-bold text-texto">
            {PASOS_REGISTRO_PROFESIONAL.map((nombre, i) => (
              <li
                key={nombre}
                aria-current={i + 1 === paso ? "step" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5",
                  i + 1 === paso ? "bg-sol text-sobre-sol" : "text-texto",
                )}
              >
                {`${i + 1} · ${nombre}`}
              </li>
            ))}
          </ol>
        </div>
      </header>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-6 pt-5 pb-8 focus:outline-none lg:px-10 lg:py-12"
      >
        {children}
      </main>
    </>
  );
}
