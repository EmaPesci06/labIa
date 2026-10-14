import { createHmac, timingSafeEqual } from "node:crypto";

/** Qué preferencia apaga el link de baja de un email. */
export type CategoriaBaja = "trabajos_cerca" | "novedades";

export type CargaBaja = { usuarioId: string; categoria: CategoriaBaja };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Largo mínimo del secreto de firma: uno más corto se trata como si no estuviera configurado. */
export const LARGO_MINIMO_SECRETO = 32;

export const secretoValido = (secreto: string | undefined): secreto is string =>
  typeof secreto === "string" && secreto.length >= LARGO_MINIMO_SECRETO;

const firmar = (cuerpo: string, secreto: string): string =>
  createHmac("sha256", secreto).update(cuerpo).digest("base64url");

/**
 * Token firmado (HMAC-SHA256) para el link de baja de un email: no hace falta ingresar.
 * Lleva solo el id del usuario y la categoría; nunca el email. No vence: el link de un email
 * viejo tiene que seguir funcionando.
 */
export function firmarTokenBaja(carga: CargaBaja, secreto: string): string {
  if (!secretoValido(secreto)) throw new Error("EMAILS_SECRET debe tener al menos 32 caracteres.");
  const cuerpo = Buffer.from(`${carga.usuarioId}|${carga.categoria}`).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo, secreto)}`;
}

/** Devuelve la carga si la firma es válida, o `null` si el token está alterado o mal formado. */
export function verificarTokenBaja(token: string, secreto: string): CargaBaja | null {
  if (!secretoValido(secreto)) return null;
  const [cuerpo, firma, resto] = token.split(".");
  if (!cuerpo || !firma || resto !== undefined) return null;

  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  const [usuarioId, categoria, sobrante] = Buffer.from(cuerpo, "base64url").toString().split("|");
  if (sobrante !== undefined || !usuarioId || !UUID.test(usuarioId)) return null;
  if (categoria !== "trabajos_cerca" && categoria !== "novedades") return null;
  return { usuarioId, categoria };
}
