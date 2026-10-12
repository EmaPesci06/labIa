import type { ReactNode } from "react";

import { navegacionPara } from "@/lib/navegacion";
import { obtenerSesion } from "@/lib/sesion";

import { BarraInferior } from "./BarraInferior";
import { BarraSuperior } from "./BarraSuperior";

/**
 * Armazón de las pantallas con sesión: barra superior (escritorio), contenido y barra inferior
 * (celular). Es asíncrono porque pide la sesión; el layout lo envuelve en <Suspense>.
 */
export async function ShellApp({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();
  const navegacion = navegacionPara(sesion.rol, sesion.id);

  return (
    <>
      <BarraSuperior navegacion={navegacion} rol={sesion.rol} nombre={sesion.nombre} />
      <main
        id="contenido"
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 lg:px-10 lg:py-8"
      >
        {children}
      </main>
      <BarraInferior destinos={navegacion.celular} rol={sesion.rol} />
    </>
  );
}
