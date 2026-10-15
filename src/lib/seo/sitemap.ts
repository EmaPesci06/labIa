import type { MetadataRoute } from "next";

import { RUTAS_BUSQUEDA_OFICIO, RUTAS_PUBLICAS_SITEMAP } from "./rutas";

/** Una entrada por ruta pública, con la URL absoluta del sitio. Sin rutas privadas. */
export function construirSitemap(
  sitio: string,
  idsProfesionales: readonly string[],
): MetadataRoute.Sitemap {
  const rutas = [
    ...RUTAS_PUBLICAS_SITEMAP,
    ...RUTAS_BUSQUEDA_OFICIO,
    ...idsProfesionales.map((id) => `/profesionales/${id}`),
  ];
  return rutas.map((ruta) => ({ url: `${sitio}${ruta}` }));
}
