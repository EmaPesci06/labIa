import { Suspense, type ReactNode } from "react";

import { EsqueletoPagina } from "@/components/navegacion/Esqueleto";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { ShellExplorar } from "@/components/navegacion/ShellExplorar";

/**
 * Pantallas públicas de exploración (LAB-23): con sesión, el armazón de (app); sin sesión, barra de visitante.
 */
export default function LayoutExplorar({ children }: { children: ReactNode }) {
  return (
    <>
      <SaltarAlContenido />
      <Suspense
        fallback={
          // Mismo alto que las barras reales, para que no salte el contenido al cargar.
          <>
            <div className="hidden h-[72px] border-b border-divisor bg-superficie lg:block" />
            <main
              id="contenido"
              tabIndex={-1}
              className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 focus:outline-none lg:px-10 lg:py-8"
            >
              <EsqueletoPagina />
            </main>
          </>
        }
      >
        <ShellExplorar>{children}</ShellExplorar>
      </Suspense>
    </>
  );
}
