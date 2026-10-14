// Normas de seguridad de LabÍA (LAB-20). Fuente única para el paso 2 del registro, la página
// pública `/normas`, la re-aceptación y los términos. Si cambia el texto, subí `VERSION_NORMAS`:
// los profesionales tienen que volver a aceptar al ingresar.

import type { RolUsuario } from "@/lib/auth/rutas";

export const VERSION_NORMAS = "2026-10";

export const NORMAS: readonly string[] = [
  "Usar tu identidad real y presentar tu certificado de antecedentes.",
  "Tomar solo trabajos para los que estás capacitado. En gas, con matrícula vigente.",
  "Pasar presupuesto por escrito antes de empezar: precio, materiales y plazo.",
  "Acordar la seña con el cliente y dejarla escrita en el presupuesto.",
  "Llegar a horario o avisar con anticipación.",
  "Identificarte al llegar y no entrar con personas que el cliente no conozca.",
  "Cuidar la casa del cliente y dejar todo limpio.",
  "Trabajar con las medidas de seguridad de tu oficio.",
  "Tratar con respeto, sin discriminación ni acoso.",
  "Usar la dirección y el teléfono del cliente solo para ese trabajo.",
];

/** Lo que hace LabÍA de su lado (sección "Qué hace LabÍA"). */
export const QUE_HACE_LABIA: readonly string[] = [
  "Revisamos a mano la identidad y los antecedentes de cada profesional.",
  "Mostramos insignias solo cuando la verificación está hecha.",
  "Recibimos reportes de clientes y de profesionales.",
  "Suspendemos las cuentas que no cumplen estas normas.",
];

export const RUTA_NORMAS_REGISTRO = "/registro/profesional/normas";
export const RUTA_REACEPTAR_NORMAS = "/normas/aceptar";

/** ¿La versión aceptada es la vigente? */
export const normasAlDia = (aceptada: string | null | undefined, vigente = VERSION_NORMAS) =>
  aceptada === vigente;

/**
 * A dónde mandar a una cuenta con sesión para que acepte las normas, o `null` si no hace falta.
 * Solo aplica a profesionales: sin aceptación sigue el registro; con una versión vieja, re-acepta.
 */
export function destinoParaAceptarNormas(
  rol: RolUsuario,
  aceptada: string | null | undefined,
  vigente = VERSION_NORMAS,
): string | null {
  if (rol !== "profesional" || normasAlDia(aceptada, vigente)) return null;
  return aceptada ? RUTA_REACEPTAR_NORMAS : RUTA_NORMAS_REGISTRO;
}
