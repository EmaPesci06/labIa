import type { CategoriaBaja } from "./token";

/**
 * Lee el token de baja del fragmento de la URL (`/baja#t=<token>`, LAB-57). Pura: la usa el navegador,
 * así que no importa nada del servidor. Devuelve `null` si el fragmento no trae un token con forma válida.
 */
export function tokenDelFragmento(fragmento: string): string | null {
  const parametros = new URLSearchParams(
    fragmento.startsWith("#") ? fragmento.slice(1) : fragmento,
  );
  const token = parametros.get("t");
  return token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : null;
}

/**
 * Categoría que dice el token, SIN verificar la firma: solo sirve para mostrar el texto del formulario.
 * La firma la verifica el servidor al confirmar (`confirmarBaja`).
 */
export function categoriaSinVerificar(token: string): CategoriaBaja | null {
  const cuerpo = token.split(".")[0];
  if (!cuerpo) return null;
  const base64 = cuerpo.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  let texto: string;
  try {
    texto = atob(relleno);
  } catch {
    return null;
  }
  const categoria = texto.split("|")[1];
  return categoria === "trabajos_cerca" || categoria === "novedades" ? categoria : null;
}
