import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { inicioDelRol } from "@/lib/auth/rutas";
import { navegacionPara } from "@/lib/navegacion";
import { obtenerSesion } from "@/lib/sesion";

import { BarraInferior } from "./BarraInferior";
import { BarraSuperior } from "./BarraSuperior";

/**
 * Armazón de las pantallas con sesión: barra superior (escritorio), contenido y barra inferior
 * (celular). Es asíncrono porque pide la sesión; el layout lo envuelve en <Suspense>.
 * `proxy.ts` ya protege las rutas; esto es la segunda barrera si algo llega sin sesión.
 */
export async function ShellApp({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar");
  if (sesion.rol === "admin") redirect(inicioDelRol("admin"));

  const navegacion = navegacionPara(sesion.rol, sesion.usuario.id);

  return (
    <>
      <BarraSuperior
        navegacion={navegacion}
        rol={sesion.rol}
        nombre={sesion.perfil.nombreVisible}
      />
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 focus:outline-none lg:px-10 lg:py-8"
      >
        {children}
      </main>
      <BarraInferior destinos={navegacion.celular} rol={sesion.rol} />
    </>
  );
}
