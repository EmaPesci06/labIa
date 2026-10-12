/**
 * URL pública de una foto del bucket `fotos` (público). `null` si no hay foto o falta configurar
 * Supabase. El host tiene que estar en `images.remotePatterns` de next.config.ts.
 */
export function urlFoto(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  const limpia = path.replace(/^\/+/, "");
  if (limpia.split("/").includes("..")) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/fotos/${limpia}`;
}
