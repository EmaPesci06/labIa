"use client";

import type { ReactNode } from "react";

import { Boton, type VarianteBoton } from "@/components/ui/Boton";
import { HojaInferior } from "@/components/ui/HojaInferior";

type Props = {
  abierta: boolean;
  onCambioAbierta: (abierta: boolean) => void;
  titulo: string;
  descripcion?: string;
  textoConfirmar: string;
  varianteConfirmar?: VarianteBoton | "peligro";
  pendiente?: boolean;
  onConfirmar: () => void;
  devolverFocoA?: { current: HTMLElement | null };
  children?: ReactNode;
};

/**
 * Modal accesible de confirmación para acciones críticas en Mis Trabajos (LAB-29).
 */
export function ModalConfirmacion({
  abierta,
  onCambioAbierta,
  titulo,
  descripcion,
  textoConfirmar,
  varianteConfirmar = "profesional",
  pendiente = false,
  onConfirmar,
  devolverFocoA,
  children,
}: Props) {
  const esPeligro = varianteConfirmar === "peligro";

  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={onCambioAbierta}
      titulo={titulo}
      descripcion={descripcion}
      devolverFocoA={devolverFocoA}
    >
      {children}
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row-reverse sm:justify-start">
        {esPeligro ? (
          <button
            type="button"
            disabled={pendiente}
            aria-busy={pendiente || undefined}
            onClick={onConfirmar}
            className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-boton bg-error px-5 text-base font-bold text-sobre-azul transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50 sm:w-auto"
          >
            {pendiente ? "Procesando…" : textoConfirmar}
          </button>
        ) : (
          <Boton
            variante={varianteConfirmar}
            tamano="grande"
            cargando={pendiente}
            onClick={onConfirmar}
            className="sm:w-auto"
          >
            {textoConfirmar}
          </Boton>
        )}
        <Boton
          variante="secundario"
          tamano="grande"
          disabled={pendiente}
          onClick={() => onCambioAbierta(false)}
          className="sm:w-auto"
        >
          Cancelar
        </Boton>
      </div>
    </HojaInferior>
  );
}
