# lib/supabase

Clientes de Supabase con `@supabase/ssr` y los tipos generados con `supabase gen types typescript`.

| Archivo        | Para qué                                                            | Dónde se usa                                      |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `servidor.ts`  | Cliente con la clave anon y las cookies del usuario (la RLS aplica) | Server Components, Server Actions, Route Handlers |
| `navegador.ts` | Lo mismo, para el navegador                                         | Componentes de cliente                            |
| `proxy.ts`     | Refresca la sesión y lee el rol en cada pedido                      | Solo `src/proxy.ts`                               |
| `admin.ts`     | Service role (saltea RLS), con `import "server-only"`               | Solo `/admin` y jobs; nunca el navegador          |

La sesión del pedido se lee con `obtenerSesion()` de `src/lib/sesion.ts`. La protección de rutas está en
`src/proxy.ts` (decisión en `src/lib/auth/rutas.ts`, con tests).

## Cómo se verifica la sesión (LAB-88)

El proyecto firma los JWT con una clave asimétrica (ES256; la clave pública está en
`/auth/v1/.well-known/jwks.json`). Por eso `getClaims()` verifica la firma en el servidor sin ir a Auth.

| Dónde                                                   | Qué usa                                   |
| ------------------------------------------------------- | ----------------------------------------- |
| `proxy.ts` y `obtenerSesion()` (pintar pantallas)       | `getClaims()` + una lectura de `usuarios` |
| Server Actions y `/admin` (`obtenerSesionVerificada()`) | `getUser()` (valida el token contra Auth) |

`getClaims()` no ve una sesión revocada hasta que vence el token (1 h). La cuenta suspendida o dada de baja
se detecta igual: el estado se lee de `usuarios` en cada pedido (proxy y segunda barrera en `obtenerSesion`).
Si el proyecto volviera a una clave simétrica (HS256), `getClaims()` llama a Auth como `getUser()`: seguiría
siendo seguro, solo más lento.
