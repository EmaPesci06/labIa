/** `<usuario_id>/<archivo>.<ext>` o similar: segmentos de letras, números, `-`, `_` y `.` (sin `..`). */
const RUTA_FOTO = /^(?!.*\.\.)[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*\.[A-Za-z0-9]{2,5}$/;

/**
 * URL pública de una foto del bucket `fotos` (público). `null` si no hay foto, la ruta no es
 * válida o falta configurar Supabase. El host tiene que estar en `images.remotePatterns` de
 * next.config.ts.
 */
export function urlFoto(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base || !RUTA_FOTO.test(path)) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/fotos/${path}`;
}
