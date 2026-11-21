import { createRequire } from "node:module";

// Los usuarios del Supabase falso: el `sub` del JWT tiene que ser el id real de cada uno.
const { USUARIOS } = createRequire(__filename)("./supabase-falso.cjs") as {
  USUARIOS: Record<string, { id: string }>;
};

/**
 * Token de sesión de las pruebas (LAB-88). La app verifica la sesión con `getClaims()`, que primero
 * decodifica el JWT: un texto suelto como "tok-cliente" ya no alcanza. Esto arma un JWT de forma
 * válida (3 partes, `exp` a futuro) con algoritmo HS256: con un algoritmo simétrico `getClaims`
 * confirma el token llamando a `/auth/v1/user` del Supabase falso, que lee el nombre del token en
 * el claim `tok`. El `sub` es el id del usuario falso. No es una firma real y no sirve contra
 * Supabase de verdad.
 */
export function tokenJwt(nombre: string): string {
  const parte = (objeto: unknown) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const sub = USUARIOS[nombre]?.id ?? nombre;
  return `${parte({ alg: "HS256", typ: "JWT" })}.${parte({ sub, tok: nombre, exp })}.firma-falsa`;
}
