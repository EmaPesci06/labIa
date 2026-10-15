import { headers } from "next/headers";

/**
 * Balde de los pedidos sin IP identificable (por ejemplo, en pruebas locales fuera de Vercel).
 * Todos esos pedidos comparten este balde, así que es un límite más estricto, no un bypass.
 */
export const IP_DESCONOCIDA = "desconocida";

/**
 * Expande una IPv6 (comprimida con `::` o con IPv4 al final) en sus 8 grupos de 4 dígitos hex.
 * Devuelve `null` si no es una IPv6 válida.
 */
function expandirIPv6(ip: string): string[] | null {
  let texto = ip.toLowerCase();
  const conIPv4 = texto.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (conIPv4) {
    const octetos = conIPv4.slice(2, 6).map(Number);
    if (octetos.some((o) => o > 255)) return null;
    const [a, b, c, d] = octetos as [number, number, number, number];
    texto = `${conIPv4[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const partes = texto.split("::");
  if (partes.length > 2) return null;
  const cabeza = partes[0] ? partes[0].split(":") : [];
  const cola = partes.length === 2 && partes[1] ? partes[1].split(":") : [];
  let grupos: string[];
  if (partes.length === 2) {
    const relleno = 8 - cabeza.length - cola.length;
    if (relleno < 1) return null;
    grupos = [...cabeza, ...Array<string>(relleno).fill("0"), ...cola];
  } else {
    grupos = cabeza;
  }
  if (grupos.length !== 8 || grupos.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return grupos.map((g) => g.padStart(4, "0"));
}

/**
 * Clave de una IP para los límites. Una IPv4 se usa tal cual. Una IPv6 se reduce a su prefijo /64
 * (los primeros 4 grupos, expandidos): un mismo cliente con varias direcciones de su /64 cuenta
 * como uno solo. Si la IPv6 no se puede leer, se usa el texto original (el balde queda separado).
 */
export function claveDeIp(ip: string): string {
  if (!ip.includes(":")) return ip;
  const grupos = expandirIPv6(ip);
  return grupos ? `${grupos.slice(0, 4).join(":")}::/64` : ip;
}

/**
 * IP del cliente para los límites de uso (LAB-41). El despliegue es solo en Vercel, sin proxy
 * delante: Vercel sobrescribe `x-vercel-forwarded-for` con la IP del cliente. Por eso no se usa
 * `x-forwarded-for` (lo arma el cliente) ni `x-real-ip`: no están bajo control de la plataforma.
 * Para IPv6 devuelve el prefijo /64 (ver `claveDeIp`), así todos los límites lo usan igual.
 */
export function ipDeEncabezados(encabezados: Pick<Headers, "get">): string {
  const vercel = encabezados.get("x-vercel-forwarded-for")?.trim();
  return vercel ? claveDeIp(vercel) : IP_DESCONOCIDA;
}

/** IP del pedido actual. Solo se usa dentro de Server Actions o Route Handlers. */
export async function ipDelPedido(): Promise<string> {
  return ipDeEncabezados(await headers());
}
