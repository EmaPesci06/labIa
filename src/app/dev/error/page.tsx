import { notFound } from "next/navigation";

import { BotonErrorForzado } from "./BotonErrorForzado";

// Solo en desarrollo (LAB-15): fuerza un error para probar Sentry y el filtro de datos personales.
export default function ErrorDePrueba() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Error de prueba</h1>
      <p className="max-w-md text-base">
        El botón tira un error con un email y un teléfono falsos en el mensaje. En Sentry tienen que
        llegar como [filtrado].
      </p>
      <BotonErrorForzado />
    </main>
  );
}
