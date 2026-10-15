# tests/e2e

Pruebas de punta a punta con Playwright. Corren en los proyectos `celular` (390×844) y `escritorio` (1440×900):
`pnpm test:e2e`. El servidor se levanta solo con `pnpm build && pnpm start`.

El build de e2e corre con `NODE_ENV=production`, así que el limitador de intentos exige `RATE_LIMIT_SECRET` (LAB-49).
`playwright.config.ts` le pasa un valor de prueba a los tres servidores (o el de la shell, si existe); no hay que
cargarlo a mano en la CI ni en local.
