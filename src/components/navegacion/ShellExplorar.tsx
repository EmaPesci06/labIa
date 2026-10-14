import type { ReactNode } from "react";

import { obtenerSesion } from "@/lib/sesion";

import { BarraVisitante } from "./BarraVisitante";
import { ShellApp } from "./ShellApp";

/**
 * Armazón de las pantallas públicas de exploración (grupo `(explorar)`: inicio, búsqueda y perfiles).
 * Con sesión es el mismo armazón que `(app)`; sin sesión muestra la barra de visitante en vez de
 * redirigir. Es una lista blanca: `(app)` sigue siendo privado por defecto y redirige a ingresar.
 */
export async function ShellExplorar({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();
  if (sesion) return <ShellApp>{children}</ShellApp>;

  return (
    <>
      <BarraVisitante />
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 focus:outline-none lg:px-10 lg:py-8"
      >
        {children}
      </main>
    </>
  );
}
