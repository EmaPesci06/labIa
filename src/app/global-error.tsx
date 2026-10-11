"use client";

// Reemplaza al layout raíz cuando falla él mismo: no tiene globals.css, por eso estilos en línea.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorGlobal({
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
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          colorScheme: "light dark",
        }}
      >
        <title>Algo salió mal · LabÍA</title>
        <h1 style={{ fontSize: 24, margin: 0 }}>Algo salió mal</h1>
        <p style={{ margin: 0 }}>Ya nos avisaron del error. Probá de nuevo en un rato.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ minHeight: 44, padding: "8px 20px", fontSize: 16, fontWeight: 700 }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
