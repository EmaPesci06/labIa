"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState, type KeyboardEvent } from "react";

type Props = {
  fotos: readonly string[];
  tituloTrabajo?: string;
};

/**
 * Grilla de fotos adjuntadas por el cliente en el detalle del trabajo.
 * En celular y escritorio: grilla de 2 columnas con aspect-ratio 4/3.
 * Tocar una foto abre el visor a pantalla completa con navegación por teclado y botones.
 */
export function GaleriaFotosTrabajo({ fotos, tituloTrabajo = "Trabajo" }: Props) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [actual, setActual] = useState(0);
  const total = fotos.length;

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
      <ul className="grid grid-cols-2 gap-2 sm:gap-3">
        {fotos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => {
                setActual(i);
                setAbierta(i);
              }}
              aria-label={`Ver foto ${i + 1} de ${total} de ${tituloTrabajo}`}
              className="relative block aspect-4/3 w-full overflow-hidden rounded-xl border border-divisor bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-naranja-marca"
            >
              <Image
                src={url}
                alt={`Foto ${i + 1} del trabajo`}
                fill
                sizes="(max-width: 768px) 50vw, 300px"
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
              {`Fotos de ${tituloTrabajo}: foto ${actual + 1} de ${total}`}
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
                className="flex size-11 items-center justify-center rounded-full bg-superficie text-texto transition-colors hover:bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-naranja-marca"
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
                  <div
                    key={url}
                    className="relative flex h-full w-full shrink-0 snap-center items-center justify-center p-4"
                  >
                    <div className="relative max-h-full max-w-full">
                      <Image
                        src={url}
                        alt={`Foto ${i + 1} de ${total} de ${tituloTrabajo}`}
                        width={1200}
                        height={900}
                        priority={i === actual}
                        className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      const c =
                        e.currentTarget.parentElement?.querySelector<HTMLElement>(
                          "[data-carrusel]",
                        );
                      ir(c ?? null, actual - 1);
                    }}
                    disabled={actual === 0}
                    aria-label="Foto anterior"
                    className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie text-texto shadow-sm transition-opacity focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-naranja-marca disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft aria-hidden strokeWidth={2} className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const c =
                        e.currentTarget.parentElement?.querySelector<HTMLElement>(
                          "[data-carrusel]",
                        );
                      ir(c ?? null, actual + 1);
                    }}
                    disabled={actual === total - 1}
                    aria-label="Foto siguiente"
                    className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-superficie text-texto shadow-sm transition-opacity focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-naranja-marca disabled:pointer-events-none disabled:opacity-30"
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
