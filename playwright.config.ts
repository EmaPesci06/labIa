import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3000;
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
  webServer: {
    command: "pnpm build && pnpm start",
    url: URL_BASE,
    reuseExistingServer: !enCI,
    timeout: 300_000,
  },
});
