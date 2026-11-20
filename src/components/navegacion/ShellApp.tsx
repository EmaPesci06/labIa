import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { elegirBarrio } from "@/lib/barrios-busqueda";
import { barrioDeLaCuenta, obtenerBarrios } from "@/lib/busqueda-servidor";
import { altaIncompleta, RUTA_COMPLETAR_ALTA } from "@/lib/auth/alta";
import { inicioDelRol } from "@/lib/auth/rutas";
import { destinoParaAceptarNormas } from "@/lib/normas";
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

  // LAB-81: un cliente que no aceptó "mayor de 18 y términos" termina el alta antes de seguir.
  if (altaIncompleta(sesion)) redirect(RUTA_COMPLETAR_ALTA);

  // LAB-20: un profesional sin las normas vigentes las acepta antes de seguir.
  const aceptarNormas = destinoParaAceptarNormas(sesion.rol, sesion.normasVersion);
  if (aceptarNormas) redirect(aceptarNormas);

  const navegacion = navegacionPara(sesion.rol, sesion.usuario.id);

  // LAB-71: el cliente ve su barrio en la barra superior ("Estás en …") y puede cambiarlo.
  let barrio: { actual: string; barrios: Awaited<ReturnType<typeof obtenerBarrios>> } | undefined;
  if (sesion.rol === "cliente") {
    const barrios = await obtenerBarrios();
    barrio = {
      actual: elegirBarrio(barrios, undefined, await barrioDeLaCuenta(sesion)),
      barrios,
    };
  }

  return (
    <>
      <BarraSuperior navegacion={navegacion} nombre={sesion.perfil.nombreVisible} barrio={barrio} />
      <main id="contenido" tabIndex={-1} className="marco flex-1 focus:outline-none">
        {children}
      </main>
      <BarraInferior destinos={navegacion.celular} />
    </>
  );
}
