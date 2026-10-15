import { headers } from "next/headers";

/** Valor cuando no hay forma de identificar la IP (por ejemplo, en pruebas locales). */
export const IP_DESCONOCIDA = "desconocida";

/**
 * IP del cliente para los límites de uso (LAB-41). Solo confía en cabeceras que pone la plataforma:
 * `x-vercel-forwarded-for` (Vercel) y, si no está, `x-real-ip`. Nunca el primer valor de
 * `x-forwarded-for`: lo arma el propio cliente y cualquiera lo puede falsear para saltear el límite.
 */
export function ipDeEncabezados(encabezados: Pick<Headers, "get">): string {
  const vercel = encabezados.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel;
  const real = encabezados.get("x-real-ip")?.trim();
  return real || IP_DESCONOCIDA;
}

/** IP del pedido actual. Solo se usa dentro de Server Actions o Route Handlers. */
export async function ipDelPedido(): Promise<string> {
  return ipDeEncabezados(await headers());
}
