import { Suspense, type ReactNode } from "react";

import { EsqueletoPagina } from "@/components/navegacion/Esqueleto";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { ShellApp } from "@/components/navegacion/ShellApp";

/**
 * Pantallas con sesión (LAB-13): barra inferior en celular y barra superior en escritorio.
 * La protección real (redirigir si no hay sesión) llega con LAB-16; hoy la sesión es falsa.
 */
export default function LayoutApp({ children }: { children: ReactNode }) {
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
        <ShellApp>{children}</ShellApp>
      </Suspense>
    </>
  );
}
