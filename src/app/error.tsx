"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";

export default function ErrorDePagina({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <Logo alt="Oficio Seguro" />
      <div aria-hidden className="w-24 corte-cupon" />
      <h1 className="font-titulo text-[28px]">Algo salió mal</h1>
      <p className="text-base text-texto">Ya nos avisaron del error. Probá de nuevo en un rato.</p>
      <div className="flex w-full flex-col gap-3">
        <Boton variante="cliente" tamano="grande" bloque onClick={() => retry()}>
          Reintentar
        </Boton>
        <Boton href="/inicio" variante="secundario" tamano="grande" bloque>
          Ir al inicio
        </Boton>
      </div>
    </main>
  );
}
