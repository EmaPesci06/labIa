"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState, type KeyboardEvent } from "react";

type Props = {
  /** URLs públicas de las fotos (bucket `fotos`). */
  fotos: readonly string[];
  /** Para el texto alternativo: "Foto 2 de 5 de trabajos de Martín G.". */
  nombre: string;
};

/**
 * "Trabajos hechos": grilla de fotos (3 columnas en celular, 4 en escritorio). Tocar una abre un
 * visor a pantalla completa con deslizamiento horizontal, botones y flechas del teclado; se cierra
 * con Esc, con la X o tocando afuera (Radix Dialog: foco atrapado y devuelto a la miniatura).
 */
export function GaleriaTrabajos({ fotos, nombre }: Props) {
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

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3">
        {fotos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => {
                setActual(i);
                setAbierta(i);
              }}
              aria-label={`Ver foto ${i + 1} de ${total} de trabajos de ${nombre}`}
              className="relative block aspect-square w-full overflow-hidden rounded-xl bg-divisor lg:rounded-[14px]"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(min-width: 1024px) 220px, 33vw"
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
              {`Trabajos hechos por ${nombre}: foto ${actual + 1} de ${total}`}
            </Dialog.Title>

            <div className="flex items-center justify-between gap-3 p-4">
              <span
                aria-hidden
                className="rounded-full bg-superficie px-3 py-1.5 font-mono text-[13px] font-semibold"
              >
                {actual + 1} / {total}
              </span>
              <Dialog.Close
                aria-label="Cerrar"
                className="flex size-11 items-center justify-center rounded-full bg-superficie"
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
                      alt={`Foto ${i + 1} de ${total} de trabajos de ${nombre}`}
                      fill
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
                    className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie disabled:opacity-40 sm:flex"
                  >
                    <ChevronLeft aria-hidden strokeWidth={2} className="size-5" />
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
                    className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie disabled:opacity-40 sm:flex"
                  >
                    <ChevronRight aria-hidden strokeWidth={2} className="size-5" />
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
