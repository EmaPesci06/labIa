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

## Estructura

```
src/app/(publico)/      bienvenida, ingresar, registro, normas, términos, privacidad
src/app/(app)/          inicio, buscar, profesionales/[id], trabajos, mis-trabajos, cuenta
src/app/admin/          verificaciones, reportes (solo rol admin)
src/app/api/            route handlers puntuales (callbacks de auth, webhooks)
src/components/ui/      componentes base (Boton, Campo, Chip, Insignia, Tarjeta, HojaInferior, CintaMetrica…)
src/components/         componentes de dominio (TarjetaProfesional, TarjetaTrabajo…)
src/lib/supabase/       clientes server/browser/admin y tipos generados
src/lib/validaciones/   esquemas Zod
src/lib/                utilidades: formato.ts, whatsapp.ts, distancia.ts
src/emails/             plantillas React Email
supabase/               migrations/ y seed.sql
tests/e2e/              Playwright
.github/workflows/      CI
```

Rutas en español sin acentos: `/`, `/ingresar`, `/registro`, `/registro/cliente`, `/registro/profesional`, `/normas`,
`/inicio`, `/buscar`, `/profesionales/[id]`, `/trabajos`, `/trabajos/nuevo`, `/trabajos/[id]`, `/mis-trabajos`, `/cuenta`,
`/admin/verificaciones`, `/admin/reportes`, `/terminos`, `/privacidad`.

## Convenciones

- **Idioma:** interfaz en español rioplatense con voseo ("Buscá", "Publicá tu trabajo"). Base de datos en `snake_case`
  sin acentos ni ñ (`resenas`). Código: dominio en español (`trabajo`, `postulacion`), lo demás en inglés si es más natural.
- **Mobile first:** se diseña a 390 px; escritorio desde `lg` (1024 px), pensado a 1440 px.
- **Accesibilidad:** táctiles de 44 px, `label` en todos los campos, foco `outline: 3px solid #D45F3A; outline-offset: 2px`,
  contraste AA, `prefers-reduced-motion`, errores asociados con `aria-describedby`.
- **Formularios:** Server Action + esquema Zod + `useActionState`; errores en castellano al lado del campo.
- **Server Components** por defecto; Server Actions para mutaciones.
- **Teléfonos:** E.164 (`+549223…`) con `normalizarTelefono` de `src/lib/whatsapp.ts`; links con `linkWhatsApp`.
- **Dinero:** pesos enteros, `formatearPesos` (`Intl.NumberFormat('es-AR', ARS, 0 decimales)`).
- **Fechas:** zona `America/Argentina/Buenos_Aires`, relativas en listas con `haceCuanto` ("hace 20 min").
- **Distancias:** una decimal con coma, `formatearDistancia` ("a 1,2 km").
- **Imágenes:** comprimidas en el navegador (máx. 1600 px, calidad 0,8, máx. 2 MB), mostradas con `next/image`.
- **Diseño:** colores, tipografías (Archivo, Atkinson Hyperlegible Next, IBM Plex Mono) y la cinta métrica en la guía §5.
- **Sin** `console.log`, **sin** `any`, **sin** secretos en el repo. `.env.example` lista todas las variables sin valores.

## Seguridad (no negociable)

1. RLS en todas las tablas, con tests de políticas.
2. Documentos en el bucket privado `documentos` (`<usuario_id>/<tipo>-<timestamp>.<ext>`): el dueño sube pero no lee;
   solo un admin genera URLs firmadas de 60 s.
3. Nunca mostrar DNI ni antecedentes en pantallas públicas: solo insignias.
4. Nunca pedir ni guardar dirección exacta.
5. `SUPABASE_SERVICE_ROLE_KEY` solo en servidor dentro de `/admin` y jobs.
6. Toda Server Action valida sesión, rol y entrada con Zod.
7. Rate limit simple en registro, postulación y reporte.

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
