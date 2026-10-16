"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

/**
 * Las URL firmadas del bucket privado `fotos-trabajos` (LAB-52) no pasan por el optimizador de
 * `next/image`: `images.remotePatterns` solo admite las públicas. Se muestran tal cual.
 */
export function esUrlFirmada(url: string): boolean {
  return url.includes("/storage/v1/object/sign/");
}

type VisorFotosProps = {
  /** URLs de las fotos: públicas (bucket `fotos`) o firmadas (bucket `fotos-trabajos`). */
  fotos: readonly string[];
  /** Frase que dice de quién son las fotos: "Olor a gas en la cocina" o "trabajos de Martín G.". */
  contexto: string;
  /** "cuadradas" (perfil, 3 o 4 columnas) o "apaisadas" (detalle del trabajo, 2 columnas). */
  miniaturas?: "cuadradas" | "apaisadas";
};

const BOTON_FLECHA =
  "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie text-texto shadow-sm transition-opacity focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:pointer-events-none disabled:opacity-30";

/**
 * Grilla de fotos con visor a pantalla completa. Lo usan "Trabajos hechos" del perfil y las fotos
 * del trabajo. Tocar una miniatura abre el visor (Radix Dialog: foco atrapado y devuelto); se
 * navega con deslizamiento, botones o flechas del teclado y se cierra con Esc o la X.
 */
export function VisorFotos({ fotos, contexto, miniaturas = "cuadradas" }: VisorFotosProps) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [actual, setActual] = useState(0);
  const total = fotos.length;

  // Al abrir, el carrusel arranca en la foto tocada.
  const alMontarCarrusel = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && abierta !== null) el.scrollLeft = abierta * el.clientWidth;
    },
    [abierta],
  );

  if (total === 0) return null;

  function ir(contenedor: HTMLElement | null, indice: number) {
    if (!contenedor) return;
    const destino = Math.min(total - 1, Math.max(0, indice));
    contenedor.scrollTo({ left: destino * contenedor.clientWidth });
    setActual(destino);
  }

  function alTeclado(evento: KeyboardEvent<HTMLElement>) {
    const carrusel = evento.currentTarget.querySelector<HTMLElement>("[data-carrusel]");
    if (evento.key === "ArrowRight") {
      evento.preventDefault();
      ir(carrusel, actual + 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      ir(carrusel, actual - 1);
    }
  }

  const apaisadas = miniaturas === "apaisadas";

  return (
    <>
      <ul
        className={cn(
          apaisadas
            ? "grid grid-cols-2 gap-2 sm:gap-3"
            : "grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3",
        )}
      >
        {fotos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => {
                setActual(i);
                setAbierta(i);
              }}
              aria-label={`Ver foto ${i + 1} de ${total} de ${contexto}`}
              className={cn(
                "relative block w-full overflow-hidden bg-divisor focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
                apaisadas
                  ? "aspect-4/3 rounded-xl border border-divisor bg-superficie-elevada"
                  : "aspect-square rounded-xl lg:rounded-[14px]",
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                unoptimized={esUrlFirmada(url)}
                sizes={
                  apaisadas ? "(max-width: 768px) 50vw, 300px" : "(min-width: 1024px) 220px, 33vw"
                }
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root
        open={abierta !== null}
        onOpenChange={(abrir) => {
          if (!abrir) setAbierta(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-velo" />
          <Dialog.Content
            aria-describedby={undefined}
            onKeyDown={alTeclado}
            className="fixed inset-0 z-50 flex flex-col bg-velo text-texto"
          >
            <Dialog.Title className="sr-only">
              {`Foto ${actual + 1} de ${total} de ${contexto}`}
            </Dialog.Title>

            <div className="flex items-center justify-between gap-3 p-4">
              <span
                aria-hidden
                className="rounded-full bg-superficie px-3 py-1.5 font-mono text-[13px] font-semibold text-texto"
              >
                {actual + 1} / {total}
              </span>
              <Dialog.Close
                aria-label="Cerrar"
                className="flex size-11 items-center justify-center rounded-full bg-superficie text-texto transition-colors hover:bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                <X aria-hidden strokeWidth={2} className="size-5" />
              </Dialog.Close>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={alMontarCarrusel}
                data-carrusel=""
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.clientWidth > 0) setActual(Math.round(el.scrollLeft / el.clientWidth));
                }}
                className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
              >
                {fotos.map((url, i) => (
                  <div key={url} className="relative h-full w-full shrink-0 snap-center">
                    <Image
                      src={url}
                      alt={`Foto ${i + 1} de ${total} de ${contexto}`}
                      fill
                      unoptimized={esUrlFirmada(url)}
                      sizes="100vw"
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    disabled={actual === 0}
                    onClick={(e) =>
                      ir(
                        e.currentTarget.parentElement?.querySelector<HTMLElement>(
                          "[data-carrusel]",
                        ) ?? null,
                        actual - 1,
                      )
                    }
                    className={cn(BOTON_FLECHA, "left-3")}
                  >
                    <ChevronLeft aria-hidden strokeWidth={2} className="size-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Foto siguiente"
                    disabled={actual === total - 1}
                    onClick={(e) =>
                      ir(
                        e.currentTarget.parentElement?.querySelector<HTMLElement>(
                          "[data-carrusel]",
                        ) ?? null,
                        actual + 1,
                      )
                    }
                    className={cn(BOTON_FLECHA, "right-3")}
                  >
                    <ChevronRight aria-hidden strokeWidth={2} className="size-6" />
                  </button>
                </>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
