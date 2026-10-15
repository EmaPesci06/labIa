import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { construirSitemap } from "@/lib/seo/sitemap";
import { urlDelSitio } from "@/lib/sitio";
import type { Database } from "@/lib/supabase/tipos";

const LIMITE_PERFILES = 5000;

/**
 * Ids de los perfiles publicados, con la clave anon: la RLS solo deja ver perfiles publicados de
 * cuentas activas. Cacheado una hora. Si la base no responde, devuelve `[]` y el sitemap sale con
 * las rutas fijas.
 */
async function idsDeProfesionalesPublicados(): Promise<string[]> {
  "use cache";
  cacheLife("hours");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return [];
  try {
    const cliente = createClient<Database>(url, clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await cliente
      .from("perfiles_profesionales")
      .select("usuario_id")
      .eq("publicado", true)
      .limit(LIMITE_PERFILES);
    if (error || !data) return [];
    return data.map((fila) => fila.usuario_id);
  } catch {
    return [];
  }
}

/** Sitemap (LAB-37): inicio, búsquedas por oficio, páginas legales y perfiles publicados. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return construirSitemap(urlDelSitio(), await idsDeProfesionalesPublicados());
}
