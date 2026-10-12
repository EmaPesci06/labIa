import { expect, test } from "@playwright/test";

// LAB-24: el perfil público se ve sin cuenta. Esta prueba no depende de datos: un uuid que no
// existe responde 404 (no redirige a /ingresar).

test("sin cuenta, un perfil inexistente da 404 y no redirige a ingresar", async ({ page }) => {
  const respuesta = await page.goto("/profesionales/00000000-0000-4000-8000-000000000000");
  expect(respuesta?.status()).toBe(404);
  await expect(page).not.toHaveURL(/\/ingresar/);
  await expect(page).toHaveURL(/\/profesionales\/00000000-0000-4000-8000-000000000000$/);
});

test("sin cuenta, un id con formato inválido también da 404", async ({ page }) => {
  const respuesta = await page.goto("/profesionales/no-es-un-uuid");
  expect(respuesta?.status()).toBe(404);
  await expect(page).not.toHaveURL(/\/ingresar/);
});
