/**
 * Límite de intentos por clave (por ejemplo la IP) en una ventana de tiempo, en la memoria de cada
 * instancia. Sirve como respaldo y para los llamadores síncronos.
 *
 * Para límites compartidos entre instancias de Vercel usar `limitarPersistente` / `limitarPorIp`
 * (src/lib/rate-limit-persistente.ts), que cuentan en Postgres (LAB-41). Esta firma no cambia
 * porque otros módulos la usan de forma síncrona.
 *
 * Las claves se guardan con sha256 (no en claro: pueden ser emails o IPs). Si el mapa llega a
 * `MAX_CLAVES`, primero se descartan las ventanas vencidas y después las entradas más viejas; nunca
 * se vacía todo de golpe, que dejaría sin límite a todas las claves a la vez.
 */
import { createHash } from "node:crypto";

type Registro = { cuenta: number; vence: number };

const registros = new Map<string, Registro>();
const MAX_CLAVES = 5000;

const claveSegura = (clave: string): string => createHash("sha256").update(clave).digest("hex");

export type ResultadoLimite = { permitido: boolean; segundosParaReintentar: number };

export function limitarIntentos(
  clave: string,
  { maximo, ventanaMs }: { maximo: number; ventanaMs: number },
  ahora: number = Date.now(),
): ResultadoLimite {
  const k = claveSegura(clave);
  const actual = registros.get(k);
  if (!actual || actual.vence <= ahora) {
    // Reinicia la ventana moviendo la clave al final: el orden del mapa es de más viejo a más nuevo.
    registros.delete(k);
    if (registros.size >= MAX_CLAVES) desalojar(ahora);
    registros.set(k, { cuenta: 1, vence: ahora + ventanaMs });
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

/** Libera espacio: primero las ventanas vencidas y, si no alcanza, las entradas más viejas. */
function desalojar(ahora: number): void {
  for (const [k, r] of registros) if (r.vence <= ahora) registros.delete(k);
  for (const k of registros.keys()) {
    if (registros.size < MAX_CLAVES) break;
    registros.delete(k);
  }
}

/**
 * Lectura sin consumo: dice si el próximo intento entraría, sin contarlo. Mismo criterio que
 * `limitarIntentos`: entra si no hay ventana activa o si el conteo está por debajo del máximo.
 */
export function consultarIntentos(
  clave: string,
  { maximo }: { maximo: number; ventanaMs: number },
  ahora: number = Date.now(),
): ResultadoLimite {
  const actual = registros.get(claveSegura(clave));
  if (!actual || actual.vence <= ahora || actual.cuenta < maximo) {
    return { permitido: true, segundosParaReintentar: 0 };
  }
  return {
    permitido: false,
    segundosParaReintentar: Math.max(1, Math.ceil((actual.vence - ahora) / 1000)),
  };
}

/** Solo para tests. */
export function reiniciarLimites(): void {
  registros.clear();
}
