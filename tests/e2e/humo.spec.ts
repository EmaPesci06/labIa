import { expect, test } from "@playwright/test";

test("la página de inicio carga y muestra LabÍA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("LabÍA");
  await expect(page.getByRole("heading", { level: 1, name: "LabÍA" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
});
