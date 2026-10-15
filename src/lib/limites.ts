import { cache } from "react";

import {
  limitarPersistente,
  limitarPorIp,
  mensajeDeLimite,
  type ReglaLimite,
} from "@/lib/rate-limit-persistente";

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Umbrales de los topes por IP y por cuenta de LAB-54 (informe de seguridad de LAB-34: M-03, M-05,
 * B-11 y B-13). Todos pasan por el limitador persistente (`limitarPorIp` / `limitarPersistente`).
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
  /**
   * Contactos por día que recibe un mismo profesional, sumando a todos los clientes. Limita cuánto
   * número se puede cosechar de un profesional aunque se usen muchas cuentas.
   */
  contactoPorProfesionalDia: { maximo: 50, ventanaMs: DIA },
  /** Reportes desde una IP: además del tope por cuenta (10 por día). */
  reportePorIp: { maximo: 30, ventanaMs: DIA },
  /** Ingreso por cuenta (email hasheado), además del tope por IP de 5 por minuto (B-11). */
  ingresoPorCuenta: { maximo: 10, ventanaMs: 15 * MINUTO },
  /** Chequeo de salud: el monitor pide cada pocos minutos; 60 por minuto deja margen de sobra. */
  salud: { maximo: 60, ventanaMs: MINUTO },
} satisfies Record<string, ReglaLimite>;

export type LecturaPublica = "busqueda" | "perfil";

const REGLA_LECTURA: Record<LecturaPublica, ReglaLimite> = {
  busqueda: REGLAS_LIMITE.busquedaPublica,
  perfil: REGLAS_LIMITE.perfilPublico,
};

/**
 * Tope por IP para las lecturas públicas que exponen perfiles (M-03). Devuelve el mensaje si la IP
 * superó el límite, o `null` si entra. Va envuelto en `cache`: si la página y su `generateMetadata`
 * lo piden en el mismo pedido, cuenta una sola vez.
 */
export const bloqueoLecturaPublica = cache(
  async (lectura: LecturaPublica): Promise<string | null> =>
    mensajeDeLimite(await limitarPorIp(`lectura-publica-${lectura}`, REGLA_LECTURA[lectura])),
);

/** Tope por IP para contactar profesionales (M-03, escenario B). */
export function limiteContactoPorIp() {
  return limitarPorIp("contacto", REGLAS_LIMITE.contactoPorIp);
}

/** Tope diario de contactos por profesional, sumando a todos los clientes (M-03, escenario B). */
export function limiteContactosDelProfesional(profesionalId: string) {
  return limitarPersistente(
    `contacto-profesional:${profesionalId}`,
    REGLAS_LIMITE.contactoPorProfesionalDia,
  );
}

/** Tope por IP para reportes (M-05). */
export function limiteReportePorIp() {
  return limitarPorIp("reporte", REGLAS_LIMITE.reportePorIp);
}

/**
 * Tope de ingreso por cuenta (B-11). La clave lleva el email normalizado; `claveDeLimite` ya lo
 * guarda hasheado (HMAC), así que el email nunca queda en claro en la tabla de cupos.
 */
export function limiteIngresoPorCuenta(email: string) {
  return limitarPersistente(
    `ingreso-cuenta:${email.trim().toLowerCase()}`,
    REGLAS_LIMITE.ingresoPorCuenta,
  );
}

/** Tope por IP para el chequeo de salud (B-13). */
export function limiteSaludPorIp() {
  return limitarPorIp("salud", REGLAS_LIMITE.salud);
}
