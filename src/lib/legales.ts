// Textos legales (LAB-35). Fuente única de la versión, la fecha y los marcadores que completa
// Emanuel. Si cambia el texto de /terminos o /privacidad, subí `VERSION_LEGALES`.

export const VERSION_LEGALES = "2026-10";
export const FECHA_LEGALES = "14 de octubre de 2026";

/** Valores a completar antes del lanzamiento (se muestran resaltados en las páginas). */
export const MARCADORES = {
  razonSocial: "[RAZÓN SOCIAL]",
  cuit: "[CUIT]",
  domicilio: "[DOMICILIO]",
  emailContacto: "[EMAIL DE CONTACTO]",
} as const;

export const RUTA_TERMINOS = "/terminos";
export const RUTA_PRIVACIDAD = "/privacidad";

/**
 * `true` cuando un abogado ya revisó los textos (`NEXT_PUBLIC_LEGALES_REVISADOS=true`). Mientras
 * sea `false`, ambas páginas muestran el aviso "Versión borrador". El acceso literal a
 * `process.env.NEXT_PUBLIC_*` es necesario para que Next lo incruste en el build.
 */
export function legalesRevisados(valor = process.env.NEXT_PUBLIC_LEGALES_REVISADOS): boolean {
  return valor === "true";
}
