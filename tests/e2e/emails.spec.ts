import { expect, test } from "@playwright/test";

test("la baja con un enlace inválido avisa y no pide ingresar", async ({ page }) => {
  await page.goto("/baja?t=token-roto");
  await expect(
    page.getByRole("heading", { level: 1, name: "Darte de baja de los emails" }),
  ).toBeVisible();
  await expect(page.getByText("Este enlace no es válido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar la baja" })).toHaveCount(0);
});

test("los crons rechazan pedidos sin el secreto", async ({ request }) => {
  for (const ruta of ["/api/cron/trabajos-cerca", "/api/cron/pedir-resena"]) {
    const respuesta = await request.get(ruta);
    expect(respuesta.status()).toBe(401);
  }
});

test("la baja de un clic por POST rechaza un token inválido", async ({ request }) => {
  const respuesta = await request.post("/api/baja?t=token-roto");
  expect(respuesta.status()).toBe(400);
});
