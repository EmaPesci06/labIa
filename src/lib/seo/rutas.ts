import { OFICIOS } from "@/lib/busqueda";

/**
 * Rutas que no deben indexarse (LAB-37): zonas con sesión, datos personales y endpoints.
 * Lo usan robots.ts y se prueban en seo.test.ts.
 */
export const RUTAS_PRIVADAS = [
  "/admin",
  "/api",
  "/cuenta",
  "/inicio",
  "/mis-trabajos",
  "/trabajos",
  "/normas/aceptar",
  "/cuenta-eliminada",
  "/baja",
  "/restablecer",
] as const;

/** Páginas públicas que van al sitemap además de las búsquedas por oficio y los perfiles. */
export const RUTAS_PUBLICAS_SITEMAP = [
  "/",
  "/buscar",
  "/normas",
  "/terminos",
  "/privacidad",
] as const;

/** Búsquedas por oficio en Mar del Plata (`/buscar?oficio=…`, sin barrio: usa el por defecto). */
export const RUTAS_BUSQUEDA_OFICIO: readonly string[] = OFICIOS.map(
  (oficio) => `/buscar?oficio=${oficio}`,
);
