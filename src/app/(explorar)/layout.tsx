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
            <div className="hidden h-16 bg-superficie lg:block" />
            {/* Sin id: el esqueleto sigue en el DOM mientras carga y #contenido debe ser único. */}
            <main className="marco flex-1">
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
