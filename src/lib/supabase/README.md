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
