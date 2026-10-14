import { z } from "zod";

import { VERSION_LEGALES } from "@/lib/legales";

export const MENSAJE_CONSENTIMIENTO =
  "Para subir tus documentos tenés que aceptar el tratamiento de tus datos sensibles";
const MENSAJE_VERSION_VIEJA =
  "La Política de privacidad se actualizó. Recargá la página y leela de nuevo.";

/** Consentimiento expreso (Ley 25.326): casilla tildada y versión de la política que vio. */
export const esquemaConsentimientoDatosSensibles = z.object({
  consiento: z.literal("on", { error: MENSAJE_CONSENTIMIENTO }),
  version: z.literal(VERSION_LEGALES, { error: MENSAJE_VERSION_VIEJA }),
});

export function leerConsentimiento(datos: FormData) {
  return { consiento: datos.get("consiento"), version: datos.get("version") };
}
