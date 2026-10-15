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
  varianteConfirmar?: VarianteBoton;
  pendiente?: boolean;
  onConfirmar: () => void;
  devolverFocoA?: { current: HTMLElement | null };
  /** Error de la última acción, dentro del diálogo para que no quede tapado por el velo. */
  error?: string | null;
  children?: ReactNode;
};

/**
 * Modal accesible de confirmación para acciones críticas en Mis Trabajos (LAB-29).
 * El botón de confirmar usa `Boton` (variante `peligro` para lo destructivo).
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
  error = null,
  children,
}: Props) {
  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={onCambioAbierta}
      titulo={titulo}
      descripcion={descripcion}
      devolverFocoA={devolverFocoA}
    >
      {children}
      {error ? (
        <p
          role="alert"
          className="rounded-[12px] border border-error/20 bg-error/10 p-3 text-sm font-semibold text-error"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row-reverse sm:justify-start">
        <Boton
          variante={varianteConfirmar}
          tamano="grande"
          cargando={pendiente}
          onClick={onConfirmar}
          className="sm:w-auto"
        >
          {textoConfirmar}
        </Boton>
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
