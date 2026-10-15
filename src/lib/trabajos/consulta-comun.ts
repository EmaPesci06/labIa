import "server-only";

import { rolFalso } from "@/lib/auth/sesion-falsa";
import type { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoPostulacion = "enviada" | "elegida" | "descartada" | "retirada";

type ClienteServidor = Awaited<ReturnType<typeof crearClienteServidor>>;

/**
 * Modo de rol falso (desarrollo): si está activo devuelve el dato de muestra; si no, ejecuta la
 * consulta real. Es el único lugar donde las consultas de trabajos miran `rolFalso()`.
 */
export async function conRolFalso<T>(falso: () => T, real: () => Promise<T>): Promise<T> {
  return rolFalso() ? falso() : real();
}

/**
 * Distancia en km entre centros de barrio, según la función `distancia_km` de la base.
 * Mismo barrio: 0 sin consultar. Sin dato: `null`.
 */
export async function distanciaEntreBarrios(
  supabase: ClienteServidor,
  barrioA: number,
  barrioB: number,
): Promise<number | null> {
  if (barrioA === barrioB) return 0;
  const { data } = await supabase.rpc("distancia_km", {
    barrio_a: barrioA,
    barrio_b: barrioB,
  });
  return data !== null ? Number(data) : null;
}

/**
 * Distancias desde un barrio hacia varios. Una consulta por barrio distinto (nunca por fila),
 * todas en paralelo, y los repetidos se piden una sola vez.
 */
export async function distanciasDesdeBarrio(
  supabase: ClienteServidor,
  origen: number,
  destinos: number[],
): Promise<Map<number, number | null>> {
  const unicos = Array.from(new Set(destinos));
  const distancias = await Promise.all(
    unicos.map(
      async (destino) => [destino, await distanciaEntreBarrios(supabase, origen, destino)] as const,
    ),
  );
  return new Map(distancias);
}
