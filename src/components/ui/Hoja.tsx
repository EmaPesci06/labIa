"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
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
   * Elemento al que vuelve el foco al cerrar (el botón que abrió la hoja). Si no se pasa o está
   * vacío, Base UI lo devuelve al elemento que tenía el foco antes de abrir.
   */
  devolverFocoA?: { current: HTMLElement | null };
  /** Esconde la X de cierre en escritorio. Esc y el velo siguen cerrando. */
  ocultarCierreEnEscritorio?: boolean;
};

/**
 * Hoja inferior en celular y diálogo centrado desde `lg` (hasta 560 px), construida sobre `Sheet`
 * de shadcn (`@base-ui/react/dialog`). Atrapa el foco, cierra con Esc o tocando afuera y devuelve
 * el foco al cerrar. No detecta el ancho con JS: el cambio a diálogo centrado es solo CSS (`lg:`).
 *
 * @example
 * <Hoja abierta={abierta} onCambioAbierta={setAbierta} titulo="Antes de contactar">…</Hoja>
 */
export function Hoja({
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
    <Sheet open={abierta} onOpenChange={(open) => onCambioAbierta(open)}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        finalFocus={() => devolverFocoA?.current ?? true}
        className={cn(
          "flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-hoja bg-fondo p-5 pb-7 text-base text-texto shadow-none data-[side=bottom]:border-t-0",
          "lg:data-[side=bottom]:inset-auto lg:data-[side=bottom]:top-1/2 lg:data-[side=bottom]:left-1/2 lg:data-[side=bottom]:w-full lg:data-[side=bottom]:max-w-[560px] lg:data-[side=bottom]:-translate-x-1/2 lg:data-[side=bottom]:-translate-y-1/2 lg:data-[side=bottom]:rounded-hoja lg:data-[side=bottom]:p-7",
          className,
        )}
      >
        <SheetHeader className="flex-row items-start justify-between gap-3 p-0">
          <SheetTitle className="font-titulo text-[28px] leading-none font-extrabold text-texto">
            {titulo}
          </SheetTitle>
          <SheetClose
            aria-label="Cerrar"
            className={cn(
              "-mt-2 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto hover:bg-sol/40",
              ocultarCierreEnEscritorio && "lg:hidden",
            )}
          >
            <X aria-hidden strokeWidth={2.5} className="size-5" />
          </SheetClose>
        </SheetHeader>
        {descripcion ? (
          <SheetDescription className="text-base text-texto">{descripcion}</SheetDescription>
        ) : null}
        {children}
      </SheetContent>
    </Sheet>
  );
}
