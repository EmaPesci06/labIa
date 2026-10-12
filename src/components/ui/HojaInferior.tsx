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
};

/**
 * Hoja inferior en celular y diálogo centrado desde `lg`. Usa Radix Dialog: foco atrapado,
 * cierra con Esc y al tocar el velo, `role="dialog"` con título. Radio superior 24 px y velo
 * `bg-velo` (rgba(27,36,56,.55)).
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
}: Props) {
  return (
    <Dialog.Root open={abierta} onOpenChange={onCambioAbierta}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-velo" />
        <Dialog.Content
          // Sin descripción, se avisa a Radix que no hay `aria-describedby` a propósito.
          {...(descripcion ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-full flex-col gap-3.5 overflow-y-auto rounded-t-hoja bg-superficie-elevada p-6 text-texto",
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-hoja",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-titulo text-[22px] leading-tight">{titulo}</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-campo text-texto-secundario hover:bg-azul-suave"
            >
              <X aria-hidden strokeWidth={2} className="size-5" />
            </Dialog.Close>
          </div>
          {descripcion ? (
            <Dialog.Description className="text-[15px] text-texto-secundario">
              {descripcion}
            </Dialog.Description>
          ) : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
