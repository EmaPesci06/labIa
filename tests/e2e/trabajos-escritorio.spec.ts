import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

// LAB-45: maestro-detalle de Trabajos en escritorio (1440 px), con el Supabase FALSO
// (tests/e2e/apoyo/supabase-falso.cjs). Solo corre en el proyecto `escritorio`.
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Maestro-detalle solo en escritorio (1440 px)");
});

const ID_GAS = "88888888-8888-4888-8888-888888888881";
const ID_CANILLA = "88888888-8888-4888-8888-888888888882";

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

test.describe("Trabajos para profesionales en escritorio (LAB-45)", () => {
  test("elegir un trabajo de la lista muestra su detalle y lo marca como seleccionado", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto("/trabajos");

    await expect(page.getByText("Elegí un trabajo para ver el detalle.")).toBeVisible();

    const lista = page.getByRole("list", { name: "Lista de trabajos disponibles" });
    await lista.getByRole("link", { name: /Olor a gas en la cocina/ }).click();

    // Escritorio selecciona con ?trabajo= y no navega a /trabajos/[id]
    await expect(page).toHaveURL(new RegExp(`/trabajos\\?.*trabajo=${ID_GAS}`));

    const detalle = page.getByRole("region", { name: "Detalle: Olor a gas en la cocina" });
    await expect(
      detalle.getByRole("heading", { level: 2, name: "Olor a gas en la cocina" }),
    ).toBeVisible();

    // Solo una tarjeta por trabajo en el DOM, y la seleccionada tiene aria-current
    await expect(lista.locator("li").filter({ hasText: "Olor a gas en la cocina" })).toHaveCount(1);
    await expect(lista.locator('li[aria-current="true"]')).toHaveCount(1);
    await expect(lista.locator('li[aria-current="true"]')).toContainText("Olor a gas en la cocina");
  });

  test("al cambiar de trabajo el detalle muestra la postulación de cada uno", async ({
    page,
    context,
  }) => {
    // El reinicio del formulario al cambiar de trabajo lo cubre el test unitario de
    // DetalleTrabajoEscritorio: el Supabase falso solo tiene trabajos ya postulados.
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto(`/trabajos?trabajo=${ID_GAS}`);

    const lista = page.getByRole("list", { name: "Lista de trabajos disponibles" });
    const detalleGas = page.getByRole("region", { name: "Detalle: Olor a gas en la cocina" });
    await expect(detalleGas.getByText("Puedo ir hoy a las 17 h.", { exact: false })).toBeVisible();

    await lista.getByRole("link", { name: /Cambiar canilla del baño/ }).click();
    await expect(page).toHaveURL(new RegExp(`trabajo=${ID_CANILLA}`));

    const detalleCanilla = page.getByRole("region", { name: "Detalle: Cambiar canilla del baño" });
    await expect(detalleCanilla.getByText("Puedo pasar hoy a la tarde a revisar.")).toBeVisible();
    await expect(
      detalleCanilla.getByText(/Postulación enviada|Retiraste tu postulación/),
    ).toBeVisible();
    await expect(detalleGas).toHaveCount(0);
  });

  test("accesibilidad: el maestro-detalle no tiene violaciones serias ni críticas", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-dueno");
    await page.goto(`/trabajos?trabajo=${ID_GAS}`);
    await expect(
      page.getByRole("region", { name: "Detalle: Olor a gas en la cocina" }),
    ).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const graves = resultado.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves).toEqual([]);
  });
});
