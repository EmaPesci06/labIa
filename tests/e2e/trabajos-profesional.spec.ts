import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

// LAB-27: camino feliz de la lista de trabajos del profesional y postulaciones,
// con el Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: token,
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { id: "x", aud: "authenticated", role: "authenticated" },
  };
  await contexto.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`,
      url: baseURL,
    },
  ]);
}

test.describe("Trabajos para profesionales (LAB-27)", () => {
  test("profesional publicado ve la lista de trabajos con filtros y tarjetas", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto("/trabajos");

    // Título y bajada
    await expect(page.getByRole("heading", { level: 1, name: "Trabajos para vos" })).toBeVisible();
    await expect(page.getByText(/Gas, Plomería/)).toBeVisible();

    // Filtros
    await expect(page.getByRole("button", { name: "Todos mis oficios" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plomería" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solo mis zonas" })).toBeVisible();

    // Tarjetas de trabajos
    await expect(page.getByText("Olor a gas en la cocina").first()).toBeVisible();
    await expect(page.getByText("Lo antes posible").first()).toBeVisible();
    await expect(page.getByText("2 postulantes").first()).toBeVisible();

    // Trabajo con postulación existente
    await expect(page.getByText("Cambiar canilla del baño").first()).toBeVisible();
    await expect(page.getByText("Te postulaste").first()).toBeVisible();
  });

  test("profesional en revisión ve la lista y el banner de aviso", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno-revision");
    await page.goto("/trabajos");

    // Banner de verificación
    await expect(
      page.getByText("Estamos revisando tu DNI y tus antecedentes. Ya podés ver trabajos."),
    ).toBeVisible();

    // Sigue viendo los trabajos disponibles
    await expect(page.getByRole("heading", { level: 1, name: "Trabajos para vos" })).toBeVisible();
    await expect(page.getByText("Olor a gas en la cocina").first()).toBeVisible();
  });

  test("pestaña postulaciones (/trabajos?vista=mias) muestra sus postulaciones y permite retirar", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto("/trabajos?vista=mias");

    await expect(page.getByRole("heading", { level: 1, name: "Mis postulaciones" })).toBeVisible();
    await expect(page.getByText("Cambiar canilla del baño")).toBeVisible();
    await expect(page.getByText("Enviada")).toBeVisible();

    // Retirar postulación
    const botonRetirar = page.getByRole("button", { name: "Retirar postulación" });
    await expect(botonRetirar).toBeVisible();
    await botonRetirar.click();

    // Confirmación
    await expect(page.getByText("¿Seguro que querés retirar tu postulación?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, retirar" }).click();

    // Ya no está en modo confirmación
    await expect(page.getByText("¿Seguro que querés retirar tu postulación?")).not.toBeVisible();
  });

  test("cliente que entra a /trabajos es redirigido a /mis-trabajos", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/trabajos");
    await expect(page).toHaveURL(/\/mis-trabajos/);
  });

  test("accesibilidad: sin violaciones serias ni críticas", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto("/trabajos");

    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    const graves = resultado.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves).toEqual([]);
  });
});
