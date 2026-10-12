import { expect, test } from "@playwright/test";

// LAB-15: sin claves de Sentry ni PostHog la app corre sin errores en consola.
test("la app corre sin errores en consola y muestra el link a Privacidad", async ({ page }) => {
  const errores: string[] = [];
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text());
  });
  page.on("pageerror", (error) => errores.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Privacidad" }),
  ).toHaveAttribute("href", "/privacidad");
  await page.waitForLoadState("networkidle");

  expect(errores).toEqual([]);
});

test("la página de error forzado no existe fuera de desarrollo", async ({ page }) => {
  const respuesta = await page.goto("/dev/error");
  expect(respuesta?.status()).toBe(404);
});
