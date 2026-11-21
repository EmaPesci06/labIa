"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/shadcn/carousel";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/shadcn/dialog";
import { cn } from "@/lib/cn";

import { SIN_ANILLO_BOTON } from "./foco";

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

const BOTON_FLECHA = cn(
  "inset-y-0 my-auto size-11 rounded-full border-0 bg-superficie text-texto shadow-sm hover:bg-superficie disabled:opacity-30 [&_svg]:size-6",
  SIN_ANILLO_BOTON,
);

/** Con `prefers-reduced-motion` el carrusel salta de foto sin deslizar (duración 0 de Embla). */
function movimientoReducido(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Grilla de fotos con visor a pantalla completa. Lo usan "Trabajos hechos" del perfil y las fotos
 * del trabajo. Tocar una miniatura abre el visor (`Dialog` de shadcn: foco atrapado y devuelto) con
 * un `Carousel` de shadcn; se navega con deslizamiento, botones o flechas del teclado y se cierra
 * con Esc o la X.
 */
export function VisorFotos({ fotos, contexto, miniaturas = "cuadradas" }: VisorFotosProps) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [actual, setActual] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const total = fotos.length;

  useEffect(() => {
    if (!api) return;
    const alElegir = () => setActual(api.selectedScrollSnap());
    api.on("select", alElegir);
    return () => {
      api.off("select", alElegir);
    };
  }, [api]);

  if (total === 0) return null;

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
                "relative block w-full overflow-hidden bg-fondo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
                apaisadas
                  ? "aspect-4/3 rounded-xl border border-fondo bg-superficie"
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

      <Dialog
        open={abierta !== null}
        onOpenChange={(abrir) => {
          if (!abrir) setAbierta(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-velo p-0 text-texto ring-0 motion-reduce:animate-none motion-reduce:duration-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">
            {`Foto ${actual + 1} de ${total} de ${contexto}`}
          </DialogTitle>

          <Carousel
            opts={{ startIndex: abierta ?? 0, duration: movimientoReducido() ? 0 : 25 }}
            setApi={setApi}
            aria-label={`Fotos de ${contexto}`}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between gap-3 p-4">
              <span
                aria-hidden
                className="rounded-full bg-superficie px-3 py-1.5 font-texto text-[13px] font-semibold text-texto"
              >
                {actual + 1} / {total}
              </span>
              <DialogClose
                aria-label="Cerrar"
                className="flex size-11 items-center justify-center rounded-full bg-superficie text-texto focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                <X aria-hidden strokeWidth={2} className="size-5" />
              </DialogClose>
            </div>

            <div className="relative min-h-0 flex-1 **:data-[slot=carousel-content]:h-full">
              <CarouselContent className="ml-0 h-full">
                {fotos.map((url, i) => (
                  <CarouselItem
                    key={url}
                    aria-label={`Foto ${i + 1} de ${total}`}
                    className="relative h-full pl-0"
                  >
                    <Image
                      src={url}
                      alt={`Foto ${i + 1} de ${total} de ${contexto}`}
                      fill
                      unoptimized={esUrlFirmada(url)}
                      sizes="100vw"
                      className="object-contain"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {total > 1 ? (
                <>
                  <CarouselPrevious
                    aria-label="Foto anterior"
                    className={cn(BOTON_FLECHA, "left-3")}
                  />
                  <CarouselNext
                    aria-label="Foto siguiente"
                    className={cn(BOTON_FLECHA, "right-3")}
                  />
                </>
              ) : null}
            </div>
          </Carousel>
        </DialogContent>
      </Dialog>
    </>
  );
}
