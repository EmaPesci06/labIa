import Link from "next/link";
import type { ReactNode } from "react";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Logo } from "@/components/ui/Logo";

/**
 * Pantallas sin sesión (LAB-13): sin navegación, logo arriba a la izquierda y el contenido
 * centrado en una columna de 480 px (celular) o 560 px (escritorio). Una pantalla a dos columnas,
 * como la bienvenida de escritorio, tiene que salirse de este grupo o ampliarlo.
 */
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <>
      <SaltarAlContenido />
      <header className="px-5 py-4 lg:px-10 lg:py-[18px]">
        <Link
          href="/"
          aria-label="LabÍA, inicio"
          className="inline-flex min-h-11 items-center rounded-campo"
        >
          <Logo alt="" prioritario />
        </Link>
      </header>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pb-8 focus:outline-none lg:max-w-[560px]"
      >
        {children}
      </main>
    </>
  );
}
