/** Minutos en que un ingreso con Google cuenta como reautenticación para borrar la cuenta. */
export const MINUTOS_REAUTENTICACION = 10;

type UsuarioAuth = {
  app_metadata?: { provider?: string; providers?: string[] } | null;
  identities?: { provider: string }[] | null;
  last_sign_in_at?: string | null;
};

/** ¿Ingresa con email y contraseña? (Si solo usa Google, no tiene contraseña que reingresar.) */
export function tieneContrasena(usuario: UsuarioAuth): boolean {
  if (usuario.identities?.some((i) => i.provider === "email")) return true;
  const meta = usuario.app_metadata;
  return Boolean(meta?.providers?.includes("email") || meta?.provider === "email");
}

/** ¿Ingresó hace poco? Sirve de reautenticación para quien usa Google. */
export function ingresoReciente(usuario: UsuarioAuth, ahora: Date = new Date()): boolean {
  if (!usuario.last_sign_in_at) return false;
  const edad = ahora.getTime() - new Date(usuario.last_sign_in_at).getTime();
  return edad >= 0 && edad <= MINUTOS_REAUTENTICACION * 60_000;
}
