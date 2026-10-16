import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Opciones de las cookies de sesión de Supabase (LAB-57, B-12). Se pasan a los dos clientes del
 * servidor (`servidor.ts` y `proxy.ts`), así no dependen solo de los defaults de `@supabase/ssr`.
 *
 * - `sameSite: "lax"`: el default de la librería (`DEFAULT_COOKIE_OPTIONS`); lo fijamos para que no
 *   cambie con una actualización.
 * - `secure`: en producción (HTTPS en Vercel) la cookie solo viaja por TLS. En desarrollo queda
 *   apagado para que `http://localhost` funcione.
 * - `httpOnly: false`: a propósito. El cliente del navegador (`createBrowserClient`) lee la sesión
 *   desde `document.cookie`; con `httpOnly` la sesión dejaría de funcionar en el navegador. La
 *   protección de la sesión es la validación con `auth.getUser()` en el servidor y la RLS.
 * - `path: "/"`: la sesión vale para toda la app.
 *
 * Este módulo no importa `server-only` ni `next/headers`: lo usa también el proxy (edge).
 */
// No se fija `name`: cambiaría la `storageKey` de la sesión y cerraría las sesiones vigentes.
export const OPCIONES_COOKIES_SESION: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
};
