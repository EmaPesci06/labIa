import { cache } from "react";

import { IP_DESCONOCIDA, ipDelPedido } from "@/lib/ip-del-pedido";
import type { ResultadoLimite } from "@/lib/rate-limit";
import { cupoDisponible } from "@/lib/rate-limit-consulta";
import {
  limitarPersistente,
  limitarPorIp,
  mensajeDeLimite,
  type ReglaLimite,
} from "@/lib/rate-limit-persistente";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/**
 * Umbrales de los topes de LAB-54 (informe de seguridad de LAB-34: M-03, M-05, B-11 y B-13). Todos
 * pasan por el limitador persistente (`limitarPorIp` / `limitarPersistente`).
 *
 * Criterio: son topes para frenar abuso masivo, no para ordenar el uso normal. Por eso son generosos.
 * Una IP móvil con CGNAT puede compartir la conexión con todo un barrio, así que el tope por IP tiene
 * que aguantar muchos usuarios legítimos detrás de la misma dirección.
 */
export const REGLAS_LIMITE = {
  /** Búsqueda pública (sin sesión): una cuenta de navegación hace pocos pedidos por minuto. */
  busquedaPublica: { maximo: 120, ventanaMs: MINUTO },
  /** Perfil público: incluye los prefetch de Next de las tarjetas visibles (hasta ~20 por página). */
  perfilPublico: { maximo: 120, ventanaMs: MINUTO },
  /** Contacto por WhatsApp desde una IP: además del tope por cuenta (10/min y 20/día). */
  contactoPorIp: { maximo: 30, ventanaMs: HORA },
  /** Reportes desde una IP: además del tope por cuenta (10 por día). */
  reportePorIp: { maximo: 30, ventanaMs: 24 * HORA },
  /**
   * Fallos de ingreso por cuenta y IP (B-11). Solo cuentan los intentos fallidos: el ingreso correcto
   * nunca consume cupo, así que nadie puede bloquear la cuenta de otro con intentos ajenos sin aciertos.
   */
  ingresoFallosPorCuentaIp: { maximo: 10, ventanaMs: 15 * MINUTO },
  /** Fallos de ingreso por email desde cualquier IP: tope alto contra la fuerza bruta distribuida. */
  ingresoFallosPorCuenta: { maximo: 50, ventanaMs: HORA },
  /** Chequeo de salud: el monitor pide cada pocos minutos; 60 por minuto deja margen de sobra. */
  salud: { maximo: 60, ventanaMs: MINUTO },
} satisfies Record<string, ReglaLimite>;

export type LecturaPublica = "busqueda" | "perfil";

const REGLA_LECTURA: Record<LecturaPublica, ReglaLimite> = {
  busqueda: REGLAS_LIMITE.busquedaPublica,
  perfil: REGLAS_LIMITE.perfilPublico,
};

const ENTRA: ResultadoLimite = { permitido: true, segundosParaReintentar: 0 };

/**
 * Tope por IP para las lecturas públicas, contacto y reportes. Con la IP `desconocida`:
 * - Fuera de Vercel (local, tests, e2e de la CI) no hay IP real, así que no se aplica el tope por IP.
 *   Los topes por cuenta siguen vigentes.
 * - En Vercel (`VERCEL_ENV` presente) el balde `desconocida` usa el tope estricto, como pide AGENTS.md
 *   §7: los pedidos sin IP identificable no se libran del límite.
 */
async function limitePorIpSiIdentificable(
  accion: string,
  regla: ReglaLimite,
): Promise<ResultadoLimite> {
  const ip = await ipDelPedido();
  if (ip === IP_DESCONOCIDA && !process.env.VERCEL_ENV) return ENTRA;
  return limitarPorIp(accion, regla);
}

/**
 * Tope por IP para las lecturas públicas que exponen perfiles (M-03). Devuelve el mensaje si la IP
 * superó el límite, o `null` si entra. Va envuelto en `cache`: si la página y su `generateMetadata`
 * lo piden en el mismo pedido, cuenta una sola vez.
 */
export const bloqueoLecturaPublica = cache(
  async (lectura: LecturaPublica): Promise<string | null> =>
    mensajeDeLimite(
      await limitePorIpSiIdentificable(`lectura-publica-${lectura}`, REGLA_LECTURA[lectura]),
    ),
);

/** Tope por IP para contactar profesionales (M-03, escenario B). */
export function limiteContactoPorIp() {
  return limitePorIpSiIdentificable("contacto", REGLAS_LIMITE.contactoPorIp);
}

/** Tope por IP para reportes (M-05). */
export function limiteReportePorIp() {
  return limitePorIpSiIdentificable("reporte", REGLAS_LIMITE.reportePorIp);
}

/**
 * Claves de los fallos de ingreso (B-11): por email+IP y por email global. La consulta previa y el
 * conteo de fallos usan exactamente estas claves, así que leen y escriben el mismo cupo.
 */
async function clavesDeFalloDeIngreso(email: string) {
  const cuenta = email.trim().toLowerCase();
  const ip = await ipDelPedido();
  return [
    { clave: `ingreso-fallo:${cuenta}:${ip}`, regla: REGLAS_LIMITE.ingresoFallosPorCuentaIp },
    { clave: `ingreso-fallo-cuenta:${cuenta}`, regla: REGLAS_LIMITE.ingresoFallosPorCuenta },
  ] as const;
}

/**
 * Lectura sin consumo antes de llamar a Supabase (B-11, LAB-54): si alguno de los dos topes de
 * fallos ya está agotado, el ingreso no se intenta, aunque la contraseña sea correcta. No cuenta nada.
 */
export async function cupoIngresoAgotado(email: string): Promise<ResultadoLimite> {
  for (const { clave, regla } of await clavesDeFalloDeIngreso(email)) {
    const cupo = await cupoDisponible(clave, regla);
    if (!cupo.permitido) return cupo;
  }
  return ENTRA;
}

/**
 * Registra un ingreso fallido (B-11). Llamar solo después de que Supabase rechace la contraseña:
 * el ingreso correcto no consume cupo. Cuenta por email+IP y por email global; si cualquiera de los
 * dos se pasa, devuelve ese resultado. Los emails sin cuenta también cuentan, así que el mensaje no
 * revela si el email existe.
 */
export async function registrarFalloDeIngreso(email: string): Promise<ResultadoLimite> {
  const [porCuentaIp, porCuenta] = await clavesDeFalloDeIngreso(email);
  const resultadoIp = await limitarPersistente(porCuentaIp.clave, porCuentaIp.regla);
  const resultadoCuenta = await limitarPersistente(porCuenta.clave, porCuenta.regla);
  return resultadoIp.permitido ? resultadoCuenta : resultadoIp;
}

/** Tope por IP para el chequeo de salud (B-13). */
export function limiteSaludPorIp() {
  return limitarPorIp("salud", REGLAS_LIMITE.salud);
}
