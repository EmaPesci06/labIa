// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { obtenerSesion } from "./sesion";

// LAB-88: prueba con un cliente real de supabase-js y un JWKS ES256 local (sin red). Confirma que
// `getClaims()` verifica la firma: un token firmado con otra clave no da sesión.
const URL_SUPABASE = "http://localhost:54321";
const estado = vi.hoisted(() => ({ cliente: null as unknown }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: async () => estado.cliente,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T extends (...args: never[]) => unknown>(f: T) => f,
}));

const ID = "11111111-1111-4111-8111-111111111111";
const FILA = {
  rol: "cliente",
  estado: "activa",
  nombre: "Laura",
  apellido: "Fernández",
  normas_version: null,
  terminos_aceptados_at: "2026-01-01T00:00:00Z",
  barrio_id: 3,
};

const b64 = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString("base64url");

function firmar(clavePrivada: KeyObject, kid: string): string {
  const cuerpo = `${b64({ alg: "ES256", typ: "JWT", kid })}.${b64({
    sub: ID,
    role: "authenticated",
    email: "l@x.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}`;
  const firma = sign("sha256", Buffer.from(cuerpo), {
    key: clavePrivada,
    dsaEncoding: "ieee-p1363",
  });
  return `${cuerpo}.${firma.toString("base64url")}`;
}

/** Cliente real de supabase-js con la sesión en memoria y `fetch` falso (JWKS + tabla usuarios). */
function armarCliente(token: string, jwks: unknown, pedidos: string[]) {
  const sesion = {
    access_token: token,
    refresh_token: "r",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: ID },
  };
  const almacen = new Map<string, string>([["sb-localhost-auth-token", JSON.stringify(sesion)]]);
  const respuesta = (cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { headers: { "content-type": "application/json" } });
  estado.cliente = createClient(URL_SUPABASE, "anon", {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      storage: {
        getItem: (k) => almacen.get(k) ?? null,
        setItem: (k, v) => void almacen.set(k, v),
        removeItem: (k) => void almacen.delete(k),
      },
    },
    global: {
      fetch: async (entrada) => {
        const url = String(entrada instanceof Request ? entrada.url : entrada);
        pedidos.push(new URL(url).pathname);
        if (url.includes("jwks.json")) return respuesta(jwks);
        if (url.includes("/rest/v1/usuarios")) return respuesta(FILA);
        return new Response("no esperado", { status: 500 });
      },
    },
  });
}

afterEach(() => {
  estado.cliente = null;
  vi.unstubAllEnvs();
});

describe("obtenerSesion con un JWT ES256 real (LAB-88)", () => {
  it("un token bien firmado da sesión, sin llamar a /auth/v1/user", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = {
      ...publicKey.export({ format: "jwk" }),
      kid: "k-buena",
      alg: "ES256",
      use: "sig",
    };
    const pedidos: string[] = [];
    armarCliente(firmar(privateKey, "k-buena"), { keys: [jwk] }, pedidos);

    const sesion = await obtenerSesion();
    expect(sesion).toMatchObject({
      usuario: { id: ID, email: "l@x.com" },
      rol: "cliente",
      barrioId: 3,
    });
    expect(pedidos).not.toContain("/auth/v1/user");
  });

  it("un token firmado con otra clave devuelve null y no lee `usuarios`", async () => {
    vi.stubEnv("LABIA_ROL_DEV", "");
    const buena = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const mala = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = {
      ...buena.publicKey.export({ format: "jwk" }),
      kid: "k-buena",
      alg: "ES256",
      use: "sig",
    };
    const pedidos: string[] = [];
    // Mismo `kid` que la clave publicada, pero firmado con una clave ajena.
    armarCliente(firmar(mala.privateKey, "k-buena"), { keys: [jwk] }, pedidos);

    expect(await obtenerSesion()).toBeNull();
    expect(pedidos.some((p) => p.includes("/rest/v1/usuarios"))).toBe(false);
  });
});
