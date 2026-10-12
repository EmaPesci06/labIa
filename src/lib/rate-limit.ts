/**
 * Límite de intentos por clave (por ejemplo la IP) en una ventana de tiempo.
 *
 * TODO(LAB-16, producción): vive en la memoria de cada instancia, así que en Vercel (varias
 * instancias serverless) el límite real es mayor al configurado. Alcanza como freno básico del
 * MVP; si hay Vercel KV / Upstash, reemplazar el cuerpo por `@upstash/ratelimit` manteniendo la firma.
 */
type Registro = { cuenta: number; vence: number };

const registros = new Map<string, Registro>();
const MAX_CLAVES = 5000;

export type ResultadoLimite = { permitido: boolean; segundosParaReintentar: number };

export function limitarIntentos(
  clave: string,
  { maximo, ventanaMs }: { maximo: number; ventanaMs: number },
  ahora: number = Date.now(),
): ResultadoLimite {
  if (registros.size > MAX_CLAVES) {
    for (const [k, r] of registros) if (r.vence <= ahora) registros.delete(k);
    // Si sigue lleno (ataque con muchas IP) se vacía para no crecer sin límite.
    if (registros.size > MAX_CLAVES) registros.clear();
  }
  const actual = registros.get(clave);
  if (!actual || actual.vence <= ahora) {
    registros.set(clave, { cuenta: 1, vence: ahora + ventanaMs });
    return { permitido: true, segundosParaReintentar: 0 };
  }
  actual.cuenta += 1;
  if (actual.cuenta > maximo) {
    return {
      permitido: false,
      segundosParaReintentar: Math.max(1, Math.ceil((actual.vence - ahora) / 1000)),
    };
  }
  return { permitido: true, segundosParaReintentar: 0 };
}

/** Solo para tests. */
export function reiniciarLimites(): void {
  registros.clear();
}
