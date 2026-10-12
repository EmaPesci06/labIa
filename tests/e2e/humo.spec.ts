import { expect, test } from "@playwright/test";

test("la bienvenida carga y muestra el título de LabÍA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LabÍA/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Oficios de confianza, cerca tuyo." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
});
