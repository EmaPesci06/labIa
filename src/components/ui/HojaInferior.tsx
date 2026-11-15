"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  abierta: boolean;
  /** Se llama con `false` al apretar Esc, tocar afuera o usar la X. */
  onCambioAbierta: (abierta: boolean) => void;
  /** Título visible; es el nombre accesible del diálogo. */
  titulo: string;
  /** Texto de apoyo opcional (se asocia con `aria-describedby`). */
  descripcion?: string;
  children?: ReactNode;
  className?: string;
  /**
   * Elemento al que vuelve el foco al cerrar (el botón que abrió la hoja). Sin esta prop, Radix
   * lo devuelve solo si hay un `Dialog.Trigger`, así que el foco quedaba en el body.
   */
  devolverFocoA?: { current: HTMLElement | null };
  /** Esconde la X de cierre en escritorio. Esc y el velo siguen cerrando. */
  ocultarCierreEnEscritorio?: boolean;
};

/**
 * Hoja inferior en celular y diálogo centrado desde `lg` (hasta 560 px). Usa Radix Dialog: atrapa el
 * foco, cierra con Esc y al tocar el velo, y devuelve el foco. Fondo `fondo` (arena), radio 28 arriba,
 * velo `velo` al 60 % detrás.
 *
 * @example
 * <HojaInferior abierta={abierta} onCambioAbierta={setAbierta} titulo="Antes de contactar">…</HojaInferior>
 */
export function HojaInferior({
  abierta,
  onCambioAbierta,
  titulo,
  descripcion,
  children,
  className,
  devolverFocoA,
  ocultarCierreEnEscritorio = false,
}: Props) {
  return (
    <Dialog.Root open={abierta} onOpenChange={onCambioAbierta}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-velo/60" />
        <Dialog.Content
          onCloseAutoFocus={(evento) => {
            const destino = devolverFocoA?.current;
            if (!destino) return;
            evento.preventDefault();
            destino.focus();
          }}
          // Sin descripción, se avisa a Radix que no hay `aria-describedby` a propósito.
          {...(descripcion ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-hoja bg-fondo p-5 pb-7 text-texto",
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-hoja lg:p-7",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-titulo text-[28px] leading-none">{titulo}</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className={cn(
                "-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto hover:bg-sol/40",
                ocultarCierreEnEscritorio && "lg:hidden",
              )}
            >
              <X aria-hidden strokeWidth={2.5} className="size-5" />
            </Dialog.Close>
          </div>
          {descripcion ? (
            <Dialog.Description className="text-base text-texto">{descripcion}</Dialog.Description>
          ) : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
