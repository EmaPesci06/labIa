/**
 * URL pública del sitio, sin barra final.
 *
 * - Producción y local: `NEXT_PUBLIC_SITE_URL` (en Vercel Production, el dominio propio).
 * - Previews de Vercel: la URL del despliegue (`NEXT_PUBLIC_VERCEL_URL`, que Vercel expone sola),
 *   así los links de los emails y los redirects de auth apuntan al preview y no a producción.
 * - Si no hay nada: `http://localhost:3000`.
 */
export interface EntornoSitio {
  siteUrl?: string | undefined;
  vercelEnv?: string | undefined;
  vercelUrl?: string | undefined;
}

const URL_LOCAL = "http://localhost:3000";

// Los accesos literales a process.env.NEXT_PUBLIC_* son necesarios para que Next los incruste en el build.
const entornoActual = (): EntornoSitio => ({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
});

const sinBarraFinal = (url: string): string => url.replace(/\/+$/, "");

const conProtocolo = (host: string): string =>
  /^https?:\/\//.test(host) ? host : `https://${host}`;

export function urlDelSitio(entorno: EntornoSitio = entornoActual()): string {
  const { siteUrl, vercelEnv, vercelUrl } = entorno;

  if (vercelEnv === "preview" && vercelUrl) {
    return sinBarraFinal(conProtocolo(vercelUrl));
  }
  if (siteUrl) {
    return sinBarraFinal(siteUrl);
  }
  if (vercelUrl) {
    return sinBarraFinal(conProtocolo(vercelUrl));
  }
  return URL_LOCAL;
}
