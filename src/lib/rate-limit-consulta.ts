import * as Sentry from "@sentry/nextjs";

import { consultarIntentos, type ResultadoLimite } from "@/lib/rate-limit";
import { claveDeLimite, type ReglaLimite } from "@/lib/rate-limit-persistente";
import { consultarCupoServicio } from "@/lib/rate-limit-servicio";
import { supabaseConfigurado } from "@/lib/supabase/servidor";

/**
 * Lectura sin consumo del limitador persistente (LAB-54): dice si el próximo intento de `clave`
 * entraría, sin contarlo. Usa la misma clave hasheada (`claveDeLimite`) que `limitarPersistente`, así
 * que lee exactamente el cupo que el consumo incrementa.
 *
 * Respaldo: si la base no responde, cae a la memoria de la instancia (como `limitarPersistente`) y lo
 * reporta a Sentry sin la clave. Así no falla abierto en silencio. Sin Supabase va directo a memoria.
 */
export async function cupoDisponible(clave: string, regla: ReglaLimite): Promise<ResultadoLimite> {
  if (!supabaseConfigurado()) return consultarIntentos(clave, regla);

  const claveHasheada = claveDeLimite(clave);
  try {
    const cupo = await consultarCupoServicio(
      claveHasheada,
      regla.maximo,
      Math.ceil(regla.ventanaMs / 1000),
    );
    return { permitido: cupo.permitido, segundosParaReintentar: cupo.segundosParaReintentar };
  } catch {
    Sentry.captureException(
      new Error("consultar_cupo falló; la lectura usa la memoria de la instancia"),
      {
        level: "error",
        tags: { componente: "rate-limit", evento: "consultar-cupo-respaldo-memoria" },
        fingerprint: ["rate-limit-consultar-cupo-respaldo-memoria"],
      },
    );
    return consultarIntentos(clave, regla);
  }
}
