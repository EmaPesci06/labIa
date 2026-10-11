"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Algo salió mal</h1>
      <p className="text-base">Ya nos avisaron del error. Probá de nuevo en un rato.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-11 rounded-xl border px-5 py-2 text-base font-bold"
      >
        Reintentar
      </button>
    </main>
  );
}
