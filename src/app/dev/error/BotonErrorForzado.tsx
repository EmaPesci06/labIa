"use client";

import { useState } from "react";

export function BotonErrorForzado() {
  const [romper, setRomper] = useState(false);

  if (romper) {
    throw new Error(
      "Error de prueba de LabÍA para Sentry: prueba@ejemplo.com, +54 9 223 555-1234, dni 30123456",
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRomper(true)}
      className="min-h-11 rounded-xl border px-5 py-2 text-base font-bold"
    >
      Forzar error
    </button>
  );
}
