# .github/workflows

- `ci.yml`: jobs `calidad`, `base-de-datos` y `e2e` en cada PR y push a `main` (LAB-14).
- `migraciones.yml`: aplica `supabase/migrations` en `labia-dev` al mergear a `main`; producción se activa en la Fase 6.

La preparación común (pnpm + Node de `.nvmrc` con caché + `pnpm install --frozen-lockfile`) está en
`.github/actions/preparar`.
