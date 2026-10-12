import { defineConfig, devices } from "@playwright/test";

const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_BASE = `http://localhost:${PUERTO}`;
const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 2 : 0,
  workers: enCI ? 1 : undefined,
  reporter: enCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: URL_BASE,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "celular",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "escritorio",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: `pnpm build && pnpm start -p ${PUERTO}`,
      url: URL_BASE,
      reuseExistingServer: !enCI,
      timeout: 300_000,
      // Habilita /dev/ui en el build de producción para correr axe contra la biblioteca de componentes.
      env: { MOSTRAR_DEV_UI: "1", EMAILS_SECRET: "secreto-solo-para-e2e" },
    },
    {
      // Mismo build, otro puerto y la sesión falsa (LAB-13) con rol profesional: se lee en cada
      // pedido, así que no hace falta volver a construir. Arranca después del primero.
      command: `pnpm start -p ${PUERTO + 100}`,
      url: `http://localhost:${PUERTO + 100}`,
      reuseExistingServer: !enCI,
      timeout: 120_000,
      env: {
        LABIA_ROL_DEV: "profesional",
        LABIA_ID_DEV: "demo",
        // En producción la sesión falsa ignora el rol de desarrollo salvo con esta bandera.
        LABIA_PERMITIR_ROL_DEV: "1",
      },
    },
    {
      // Igual, con la sesión falsa de rol cliente (las pruebas de navegación del cliente).
      // El servidor base (PUERTO) no tiene sesión falsa: es el que prueba la sesión real (LAB-16).
      command: `pnpm start -p ${PUERTO + 200}`,
      url: `http://localhost:${PUERTO + 200}`,
      reuseExistingServer: !enCI,
      timeout: 120_000,
      env: {
        LABIA_ROL_DEV: "cliente",
        LABIA_PERMITIR_ROL_DEV: "1",
      },
    },
  ],
});
