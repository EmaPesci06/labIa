/**
 * Chequeo de salud de la app (LAB-37, Guía §7): responde si el servidor llega a la base.
 * No devuelve datos de la base, ni nombres de tablas, ni mensajes de error, ni claves.
 */

export type ResultadoBase = "ok" | "error";

export type RespuestaSalud = {
  estado: "ok" | "error";
  base: ResultadoBase;
};

/** Tiempo máximo que se espera a la base antes de dar el chequeo por caído. */
export const MS_TIMEOUT_BASE = 3000;

/**
 * Ejecuta una consulta liviana contra la base y dice si respondió a tiempo sin error.
 * `consulta` es inyectable para testear sin Supabase.
 */
export async function chequearBase(
  consulta: () => PromiseLike<{ error: unknown }>,
  msTimeout: number = MS_TIMEOUT_BASE,
): Promise<ResultadoBase> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vencimiento = new Promise<{ error: unknown }>((resolver) => {
    temporizador = setTimeout(() => resolver({ error: new Error("timeout") }), msTimeout);
  });
  try {
    const { error } = await Promise.race([Promise.resolve(consulta()), vencimiento]);
    return error ? "error" : "ok";
  } catch {
    return "error";
  } finally {
    clearTimeout(temporizador);
  }
}

/** Arma la respuesta: `ok` solo si la base respondió. */
export function respuestaSalud(base: ResultadoBase): RespuestaSalud {
  return { estado: base === "ok" ? "ok" : "error", base };
}
