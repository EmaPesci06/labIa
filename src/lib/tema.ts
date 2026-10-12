/**
 * Tema claro / oscuro / sistema.
 *
 * La preferencia se guarda en la cookie `tema`. Por defecto (sin cookie) sigue al sistema.
 * El layout incluye SCRIPT_TEMA inline en <head> para poner la clase `dark` en <html> antes de
 * pintar (sin parpadeo y sin leer cookies en el servidor, así las páginas siguen siendo estáticas).
 */

export const PREFERENCIAS_TEMA = ["claro", "oscuro", "sistema"] as const;
export type PreferenciaTema = (typeof PREFERENCIAS_TEMA)[number];

export const COOKIE_TEMA = "tema";
const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return typeof valor === "string" && (PREFERENCIAS_TEMA as readonly string[]).includes(valor);
}

/** Lee la preferencia de un string de cookies (`document.cookie`). */
export function leerPreferencia(cookies: string): PreferenciaTema {
  const coincidencia = new RegExp(`(?:^|;\\s*)${COOKIE_TEMA}=([^;]*)`).exec(cookies);
  const valor = coincidencia?.[1];
  return esPreferenciaTema(valor) ? valor : "sistema";
}

export function esOscuro(preferencia: PreferenciaTema, sistemaOscuro: boolean): boolean {
  return preferencia === "oscuro" || (preferencia === "sistema" && sistemaOscuro);
}

/** Aplica la preferencia guardada (o la recibida) a <html>. Solo en el navegador. */
export function aplicarTema(preferencia: PreferenciaTema = leerPreferencia(document.cookie)) {
  const oscuro = esOscuro(preferencia, window.matchMedia(CONSULTA_OSCURO).matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

export const EVENTO_TEMA = "labia:tema";

/** Guarda la preferencia en la cookie, la aplica y avisa a los componentes suscriptos. */
export function guardarPreferencia(preferencia: PreferenciaTema) {
  document.cookie = `${COOKIE_TEMA}=${preferencia}; path=/; max-age=${UN_ANIO_EN_SEGUNDOS}; samesite=lax`;
  aplicarTema(preferencia);
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

/** Se suscribe a cambios de preferencia (selector) y del tema del sistema. */
export function suscribirseAlTema(alCambiar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_OSCURO);
  const manejar = () => {
    aplicarTema();
    alCambiar();
  };
  consulta.addEventListener("change", manejar);
  window.addEventListener(EVENTO_TEMA, alCambiar);
  return () => {
    consulta.removeEventListener("change", manejar);
    window.removeEventListener(EVENTO_TEMA, alCambiar);
  };
}

/**
 * Script inline para <head>. Es ES5 a propósito: corre antes que cualquier bundle.
 * Debe dar el mismo resultado que `aplicarTema()` (hay un test que los compara).
 */
export const SCRIPT_TEMA = `(function(){try{var m=/(?:^|;\\s*)${COOKIE_TEMA}=([^;]*)/.exec(document.cookie);var p=m?m[1]:"sistema";var o=p==="oscuro"||(p!=="claro"&&window.matchMedia("${CONSULTA_OSCURO}").matches);document.documentElement.classList.toggle("dark",o)}catch(e){}})()`;
