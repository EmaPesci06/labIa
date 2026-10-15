import { headers } from "next/headers";

/**
 * Balde de los pedidos sin IP identificable (por ejemplo, en pruebas locales fuera de Vercel).
 * Todos esos pedidos comparten este balde, así que es un límite más estricto, no un bypass.
 */
export const IP_DESCONOCIDA = "desconocida";

/**
 * IP del cliente para los límites de uso (LAB-41). El despliegue es solo en Vercel, sin proxy
 * delante: Vercel sobrescribe `x-vercel-forwarded-for` con la IP del cliente. Por eso no se usa
 * `x-forwarded-for` (lo arma el cliente) ni `x-real-ip`: no están bajo control de la plataforma.
 */
export function ipDeEncabezados(encabezados: Pick<Headers, "get">): string {
  const vercel = encabezados.get("x-vercel-forwarded-for")?.trim();
  return vercel || IP_DESCONOCIDA;
}

/** IP del pedido actual. Solo se usa dentro de Server Actions o Route Handlers. */
export async function ipDelPedido(): Promise<string> {
  return ipDeEncabezados(await headers());
}
