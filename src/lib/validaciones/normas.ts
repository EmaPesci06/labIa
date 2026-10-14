import { z } from "zod";

import { VERSION_NORMAS } from "@/lib/normas";

export const MENSAJE_ACEPTAR_NORMAS = "Aceptá las normas para seguir";
const MENSAJE_VERSION_VIEJA = "Las normas se actualizaron. Recargá la página y leelas de nuevo.";

/** Aceptación de las normas: la casilla tildada y la versión que la persona tenía en pantalla. */
export const esquemaAceptarNormas = z.object({
  acepto: z.literal("on", { error: MENSAJE_ACEPTAR_NORMAS }),
  version: z.literal(VERSION_NORMAS, { error: MENSAJE_VERSION_VIEJA }),
});

export function leerAceptacionNormas(datos: FormData) {
  return { acepto: datos.get("acepto"), version: datos.get("version") };
}
