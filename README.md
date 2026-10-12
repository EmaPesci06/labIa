# LabÍA

[![CI](https://github.com/EmaPesci06/labIa/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/EmaPesci06/labIa/actions/workflows/ci.yml)

Marketplace de oficios para Mar del Plata: los profesionales publican su perfil verificado y los clientes los encuentran
y los contactan por WhatsApp. Next.js + Supabase + Vercel.

## Para arrancar

Necesitás Node 24 LTS (`nvm use` lee `.nvmrc`) y pnpm 11.

```bash
pnpm install
cp .env.example .env.local   # completá las claves (nunca las subas)
pnpm dev                     # http://localhost:3000
```

## Comandos

| Comando                     | Qué hace                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | Servidor de desarrollo                                                                                              |
| `pnpm build` / `pnpm start` | Build y servidor de producción                                                                                      |
| `pnpm lint`                 | ESLint                                                                                                              |
| `pnpm typecheck`            | `next typegen` + `tsc --noEmit`                                                                                     |
| `pnpm test`                 | Tests de unidad con Vitest                                                                                          |
| `pnpm test:e2e`             | Playwright en `celular` (390×844) y `escritorio` (1440×900); la primera vez `pnpm exec playwright install chromium` |
| `pnpm format`               | Prettier                                                                                                            |

## Integración continua y despliegues

- **CI** (`.github/workflows/ci.yml`), en cada PR y en cada push a `main`: `calidad` (formato, lint, typecheck, unidad
  y build), `base-de-datos` (Supabase local, `db reset`, `supabase test db` y tipos al día) y `e2e` (Playwright en
  celular y escritorio; si falla, el reporte queda como artefacto `reporte-playwright`).
- **Migraciones** (`.github/workflows/migraciones.yml`): al mergear cambios en `supabase/migrations/` se aplican en
  `labia-dev` con `supabase db push`. Producción queda preparada y se activa en la Fase 6.
- **Vercel**: cada PR tiene su preview; `main` se despliega a producción. En los previews la URL del sitio sale de
  `NEXT_PUBLIC_VERCEL_URL` (ver `src/lib/sitio.ts`).
- **Dependabot**: actualizaciones semanales de npm y GitHub Actions, con las menores agrupadas.

## Más información

- [`AGENTS.md`](./AGENTS.md): stack, estructura, convenciones y definición de terminado.
- Tareas y guía completa en Linear, proyecto **LabÍA MVP**.
