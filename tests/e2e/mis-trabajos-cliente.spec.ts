import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

// LAB-29: flujo completo de Mis Trabajos del cliente:
// ver postulantes, comparar, elegir a uno atómicamente, flujo de WhatsApp con origen 'postulacion',
// cambiar de profesional y marcar como terminado.
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

test.describe("Mis trabajos del cliente (LAB-29)", () => {
  test("cliente ve la lista de sus trabajos con pestañas", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/mis-trabajos");

    // Título y pestañas
    await expect(page.getByRole("heading", { level: 1, name: "Mis trabajos" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Abiertos" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Contratados" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Terminados" })).toBeVisible();

    // Trabajo publicado en la lista
    await expect(page.getByText("Olor a gas en la cocina").first()).toBeVisible();
    await expect(page.getByText("Gas · La Perla").first()).toBeVisible();
    await expect(page.getByText("Abierto").first()).toBeVisible();
  });

  test("flujo completo: ver postulantes, elegir uno, WhatsApp, cambiar profesional y marcar terminado", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/mis-trabajos/88888888-8888-4888-8888-888888888881");

    // Encabezado del trabajo
    await expect(
      page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
    ).toBeVisible();
    await expect(page.getByText("Gas · La Perla")).toBeVisible();
    await expect(page.getByText("Abierto")).toBeVisible();

    // Postulantes presentes
    await expect(page.getByText("Martín G.")).toBeVisible();
    await expect(page.getByText(/Presupuesto estimado \$ 40\.000/)).toBeVisible();
    await expect(page.getByText(/Seña \$ 10\.000/)).toBeVisible();

    // 1. Elegir a Martín
    const botonElegir = page.getByRole("button", { name: "Elegir" }).first();
    await botonElegir.click();

    // Diálogo de confirmación accesible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("¿Elegís a Martín?")).toBeVisible();

    // Confirmar elección
    await page.getByRole("button", { name: "Elegir profesional" }).click();

    // 2. Estado contratado
    await expect(page.getByText(/Elegiste a Martín G\./)).toBeVisible();
    await expect(page.getByText("Elegido")).toBeVisible();
    await expect(page.getByText("Descartado")).toBeVisible();

    // 3. Botón de WhatsApp abre la hoja de consejos
    const botonWhatsApp = page.getByRole("button", { name: "Escribir por WhatsApp" });
    await expect(botonWhatsApp).toBeVisible();
    await botonWhatsApp.click();

    // Hoja "Antes de contactar"
    await expect(page.getByText("Antes de contactar")).toBeVisible();
    await expect(page.getByText("Pedí el presupuesto por escrito.")).toBeVisible();
    // Cerrar la hoja
    await page.keyboard.press("Escape");

    // 4. Cambiar de profesional
    const botonCambiar = page.getByRole("button", { name: "Cambiar de profesional" });
    await expect(botonCambiar).toBeVisible();
    await botonCambiar.click();

    await expect(page.getByText("¿Querés cambiar de profesional?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, cambiar de profesional" }).click();

    // Vuelve a estar abierto y se puede elegir nuevamente
    await expect(page.getByText("Abierto")).toBeVisible();
    await expect(page.getByRole("button", { name: "Elegir" }).first()).toBeVisible();

    // Volver a elegir a Martín para probar marcar terminado
    await page.getByRole("button", { name: "Elegir" }).first().click();
    await page.getByRole("button", { name: "Elegir profesional" }).click();
    await expect(page.getByText(/Elegiste a Martín G\./)).toBeVisible();

    // 5. Marcar como terminado
    const botonTerminar = page.getByRole("button", { name: "Marcar como terminado" });
    await expect(botonTerminar).toBeVisible();
    await botonTerminar.click();

    await expect(page.getByText("¿El trabajo ya está terminado?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, marcar como terminado" }).click();

    // Estado terminado y botón para reseñar
    await expect(page.getByText("Este trabajo fue completado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Dejar reseña al profesional" })).toBeVisible();
  });

  test("accesibilidad (axe) en mis trabajos y detalle", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/mis-trabajos");

    const axeLista = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(axeLista.violations).toEqual([]);

    await page.goto("/mis-trabajos/88888888-8888-4888-8888-888888888881");
    const axeDetalle = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(axeDetalle.violations).toEqual([]);
  });
});
