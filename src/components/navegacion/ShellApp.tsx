import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { inicioDelRol } from "@/lib/auth/rutas";
import { navegacionPara } from "@/lib/navegacion";
import { obtenerSesion } from "@/lib/sesion";

import { BarraVisitante } from "./BarraVisitante";
import { BarraInferior } from "./BarraInferior";
import { BarraSuperior } from "./BarraSuperior";

/**
 * Armazón de las pantallas con sesión: barra superior (escritorio), contenido y barra inferior
 * (celular). Es asíncrono porque pide la sesión; el layout lo envuelve en <Suspense>.
 * `proxy.ts` protege las rutas con sesión; sin sesión solo se ven las públicas, con barra de visitante.
 */
export async function ShellApp({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    // Inicio, búsqueda y perfiles se ven sin cuenta (LAB-23); `proxy.ts` ya manda a ingresar en el
    // resto de las rutas de `(app)`, así que acá llega un visitante solo a las públicas.
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
