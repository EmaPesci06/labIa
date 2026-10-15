import type { MetadataRoute } from "next";

import { RUTAS_PRIVADAS } from "./rutas";

/**
 * Reglas de robots. Los despliegues de preview de Vercel no se indexan: si no, Google podría
 * encontrar una copia con datos de prueba.
 */
export function construirRobots(entorno: {
  vercelEnv?: string | undefined;
  sitio: string;
}): MetadataRoute.Robots {
  if (entorno.vercelEnv === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...RUTAS_PRIVADAS] },
    sitemap: `${entorno.sitio}/sitemap.xml`,
  };
}
