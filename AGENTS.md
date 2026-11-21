# AGENTS.md · LabÍA

Resumen de la **Guía para agentes** del proyecto. La fuente de verdad es Linear: equipo `LAB`, proyecto
[LabÍA MVP](https://linear.app/emanuel-pesci/project/labia-mvp-68ef914fa314) y la
[Guía para agentes](https://linear.app/emanuel-pesci/document/guia-para-agentes-539cd378d9d9).
Si una tarea contradice la guía, manda la tarea. Si algo no está en ninguna, elegí lo más simple y dejalo escrito en el PR.

## Producto

Marketplace de oficios para Mar del Plata (solo esa ciudad en el MVP). Roles: `cliente`, `profesional` y `admin` (interno);
una cuenta tiene un solo rol. Oficios: carpintería, plomería, cerrajería, gas, pintura, mecánica, electricidad.
Contacto siempre por WhatsApp (`https://wa.me/<numero>?text=<mensaje>`), sin chat interno ni pagos en la app.
El profesional se verifica (DNI frente/dorso + antecedentes; gasistas además matrícula) antes de aparecer en búsquedas.
Nunca se guarda la dirección exacta: se elige un **barrio** y la distancia es entre centros de barrio.

## Stack

| Capa              | Tecnología                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router), React 19, TypeScript `strict` + `noUncheckedIndexedAccess`               |
| Paquetes          | pnpm 11, Node 24 LTS (`.nvmrc`, `engines`), versiones exactas sin `^`                             |
| Estilos           | Tailwind CSS 4; tokens como variables CSS, modo oscuro por clase `dark` + preferencia del sistema |
| Validación        | Zod: un esquema por formulario, compartido entre cliente y servidor                               |
| Datos             | Supabase Postgres + PostGIS, migraciones en `supabase/migrations`, RLS en todas las tablas        |
| Auth / archivos   | Supabase Auth con `@supabase/ssr`; Storage: bucket público `fotos`, privado `documentos`          |
| Hosting / CI      | Vercel (preview por PR, producción desde `main`); GitHub Actions                                  |
| Emails / métricas | Resend + React Email; Sentry y PostHog sin datos personales                                       |
| Tests             | Vitest + Testing Library (jsdom); Playwright `celular` 390×844 y `escritorio` 1440×900            |

## Comandos

```bash
pnpm install        # dependencias (Node 24: `nvm use`)
pnpm dev            # servidor de desarrollo en http://localhost:3000
pnpm lint           # ESLint (config de Next + typescript-eslint + prettier)
pnpm typecheck      # next typegen + tsc --noEmit
pnpm test           # Vitest (unidad)
pnpm build          # build de producción
pnpm test:e2e       # Playwright; levanta solo `pnpm build && pnpm start`
pnpm format         # Prettier con prettier-plugin-tailwindcss
```

La primera vez: `pnpm exec playwright install chromium`. Variables: copiá `.env.example` a `.env.local`.

## Rutas

`src/components/shadcn/` lo genera el CLI de shadcn (base-nova, Base UI): no se edita a mano; `src/components/ui/` es la capa fina encima.

Rutas en español sin acentos: `/`, `/ingresar`, `/registro`, `/registro/cliente`, `/registro/profesional`, `/normas`,
`/inicio`, `/buscar`, `/profesionales/[id]`, `/trabajos`, `/trabajos/nuevo`, `/trabajos/[id]`, `/mis-trabajos`, `/cuenta`,
`/admin/verificaciones`, `/admin/reportes`, `/terminos`, `/privacidad`.

## Convenciones

- **Idioma:** interfaz en español rioplatense con voseo ("Buscá", "Publicá tu trabajo"). Base de datos en `snake_case`
  sin acentos ni ñ (`resenas`). Código: dominio en español (`trabajo`, `postulacion`), lo demás en inglés si es más natural.
- **Mobile first:** se diseña a 390 px; escritorio desde `lg` (1024 px), pensado a 1440 px.
- **Accesibilidad:** táctiles de 44 px, `label` en todos los campos, foco `outline: 3px solid; outline-offset: 2px` en color
  `texto` (claro) y `destacado` (oscuro); en campos de texto no hay outline: el foco es el borde del campo en ese color, contraste AA, `prefers-reduced-motion`, errores asociados con `aria-describedby`.
- **Formularios:** Server Action + esquema Zod + `useActionState`; errores en castellano al lado del campo.
- **Server Components** por defecto; Server Actions para mutaciones.
- **Teléfonos:** E.164 (`+549223…`) con `normalizarTelefono` de `src/lib/whatsapp.ts`; links con `linkWhatsApp`.
- **Dinero:** pesos enteros, `formatearPesos` (`Intl.NumberFormat('es-AR', ARS, 0 decimales)`).
- **Fechas:** zona `America/Argentina/Buenos_Aires`, relativas en listas con `haceCuanto` ("hace 20 min").
- **Distancias:** una decimal con coma, `formatearDistancia` ("a 1,2 km").
- **Imágenes:** comprimidas en el navegador (máx. 1600 px, calidad 0,8, máx. 2 MB), mostradas con `next/image`.
- **Diseño ("Verano en la costa"):** tokens de color en `src/app/globals.css` (claro y oscuro): `fondo` arena,
  `superficie` blanca, `texto` azul mar, `accion` turquesa (botón principal y enlaces), `sobre-accion`, `encabezado`
  turquesa con texto `sobre-encabezado` blanco, `destacado` amarillo para lo elegido (texto `sobre-destacado`), `adorno` solo de adorno
  (nunca texto), `error`, `equipo`, `velo` (fondo de las hojas). Tipografías con `next/font`: Archivo 800 para
  títulos y la marca (`font-titulo`), Archivo (400 y 600) para el texto y Archivo Narrow 700 en mayúsculas para etiquetas (`font-etiqueta`). Referencia de toda pantalla:
  `docs/prototipo-nuevo/` (`README.md` y `CONSTRUCCION.md`). No usar hex fuera de `globals.css`.
- **shadcn (excepción a "igual al boceto"):** los archivos de `src/components/shadcn/` se generan con `pnpm dlx shadcn add`
  y **no se editan a mano**. La paleta se adapta solo desde `globals.css` (las variables `--primary`, `--border`, `--ring`…
  atadas a nuestros tokens) y la forma o los 44 px se resuelven en la capa fina de `src/components/ui/` con `className`
  y `cn()` (o con una regla por `data-slot` en `globals.css`). Las diferencias de forma con el boceto se aceptan. Radios
  de shadcn (`--radius: 0.625rem`). Los componentes de shadcn importan `cn` del paquete npm `cn` (así los sirve el registro); nuestro código sigue usando `@/lib/cn`. El foco de 3 px de los componentes de shadcn sale de `[data-slot]:focus-visible`. Para una pieza nueva: si shadcn tiene el componente, se arma una capa fina sobre él; si no, es propia (`cn()`, tokens y `Badge` o `Card` donde sirva). Los radios de campo, botón y tarjeta son `rounded-xl`, `rounded-2xl` y `rounded-3xl` (no hay tokens `--radius-campo`, `--radius-boton` ni `--radius-tarjeta`); hoja, `rounded-hoja`. Las clases `dark:` de los componentes de shadcn pisan sus estilos oscuros: en las capas finas se usan solo para anularlos.
- **Sin** `console.log`, **sin** `any`, **sin** secretos en el repo. `.env.example` lista todas las variables sin valores.

## Seguridad (no negociable)

1. RLS en todas las tablas, con tests de políticas.
2. Documentos en el bucket privado `documentos` (`<usuario_id>/<tipo>-<timestamp>.<ext>`): el dueño sube pero no lee;
   solo un admin genera URLs firmadas de 60 s.
3. Nunca mostrar DNI ni antecedentes en pantallas públicas: solo insignias.
4. Nunca pedir ni guardar dirección exacta.
5. `SUPABASE_SERVICE_ROLE_KEY` solo en servidor dentro de `/admin` y jobs. Lista cerrada de los usos fuera de
   `/admin` y jobs (ningún otro está permitido):
   - `src/lib/emails/*`: avisos por email. Lee el email de Auth de otro usuario, algo que la RLS no permite con la
     sesión del que dispara el evento. Sus funciones se llaman solo tras verificar sesión y dueño, con ids leídos
     de la base; nunca reciben emails del cliente.
   - `src/lib/cuenta/borrado.ts` (server-only): job de borrado de cuenta, invocado solo tras validar sesión, rol y
     reautenticación.
   - `consumirCupoServicio` en `src/lib/rate-limit-servicio.ts` (server-only): limitador de intentos
     (`public.consumir_cupo`). Solo recibe claves ya hasheadas (HMAC-SHA256 con `RATE_LIMIT_SECRET`, obligatorio
     con `NODE_ENV=production` o `VERCEL_ENV` production/preview; sha256 sin secreto solo en dev y tests) y solo lo llama
     `src/lib/rate-limit-persistente.ts`.
   - `consultarCupoServicio` en el mismo archivo (LAB-54): lectura sin consumo (`public.consultar_cupo`), con las
     mismas condiciones de clave. Solo la llama `src/lib/rate-limit-consulta.ts` (`cupoDisponible`), antes de
     atender una contraseña en ingreso.
6. Toda Server Action valida sesión, rol y entrada con Zod.
7. Rate limit persistente (`src/lib/rate-limit-persistente.ts`, `limitarPorIp`) en registro, ingreso, Google,
   restablecer, reenvío de confirmación, documentos, normas y cuenta; postulación y reporte cuando lleguen.
   La IP sale solo de `x-vercel-forwarded-for`: el despliegue es solo en Vercel, sin proxy delante. Si la
   cabecera falta, el pedido cae en el balde `desconocida` (un límite más estricto, no un bypass).

## Ramas, PR y Linear

- Una rama por tarea `lab-<n>-<slug>` desde `main`; un PR por tarea con título `LAB-n: <título>`.
- PR chico, con antes/después y capturas de celular y escritorio en claro y oscuro.
- Al abrir el PR: tarea en **In Review** con el link. Solo el revisor mergea (squash) y la pasa a **Done**.
- Migraciones con timestamp; nunca editar una ya mergeada.

## Definición de terminado

- Cumple todos los criterios de aceptación de la tarea.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan; CI en verde (`pnpm test:e2e` si toca flujos).
- Funciona a 390 px y a 1440 px, en modo claro y oscuro, con teclado.
- Si toca datos: migración nueva, tipos regenerados, políticas RLS con test.
- Sin `console.log`, sin `any`, sin secretos.
- Lo que quedó afuera o se decidió sin estar escrito, comentado en la tarea de Linear.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
