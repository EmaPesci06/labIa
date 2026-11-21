import { tokenJwt } from "./apoyo/token";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";
import { reiniciarFalso } from "./apoyo/reiniciar-falso";

// LAB-27: camino feliz de la lista de trabajos del profesional y postulaciones,
// con el Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: tokenJwt(token),
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
  test.describe.configure({ mode: "serial" });

  // Retirar una postulación cambia el falso: cada prueba parte del estado inicial (LAB-50).
  test.beforeEach(async () => {
    await reiniciarFalso();
  });

  test("profesional publicado ve la lista de trabajos con filtros y tarjetas", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos");

    // Título y bajada
    await expect(page.getByRole("heading", { level: 1, name: "Trabajos para vos" })).toBeVisible();
    await expect(page.getByText(/Gas, Plomería/)).toBeVisible();

    // Filtros
    await expect(page.getByRole("button", { name: "Todos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plomería" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solo mis zonas" })).toBeVisible();

    // Tarjetas de trabajos
    await expect(page.getByText("Olor a gas en la cocina").first()).toBeVisible();
    await expect(page.getByText("Para hoy").first()).toBeVisible();
    await expect(page.getByText(/2 postulaciones/).first()).toBeVisible();

    // Trabajo con postulación existente
    await expect(page.getByText("Cambiar canilla del baño").first()).toBeVisible();
    await expect(page.getByText("Te postulaste").first()).toBeVisible();
  });

  test("profesional en revisión ve la lista y el banner de aviso", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno-revision");
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
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos?vista=mias");

    await expect(page.getByRole("heading", { level: 1, name: "Mis postulaciones" })).toBeVisible();
    await expect(page.getByText("Cambiar canilla del baño")).toBeVisible();
    // Las tres postulaciones del falso siguen enviadas: "Esperando respuesta" de cada tarjeta.
    await expect(page.getByText("Esperando respuesta")).toHaveCount(3);

    // Retirar la postulación de ESTA tarjeta: el botón más cercano al título del trabajo.
    const botonRetirar = page
      .locator(
        "xpath=//a[normalize-space()='Cambiar canilla del baño']/ancestor::article[.//button[normalize-space()='Retirar mi postulación']][1]",
      )
      .getByRole("button", { name: "Retirar mi postulación" });
    await expect(botonRetirar).toBeVisible();
    await botonRetirar.click();

    // Confirmación
    await expect(page.getByText("¿Seguro que querés retirar tu postulación?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, retirar" }).click();

    // Ya no está en modo confirmación
    await expect(page.getByText("¿Seguro que querés retirar tu postulación?")).not.toBeVisible();
  });

  test("cliente que entra a /trabajos vuelve a su inicio (/inicio)", async ({
    page,
    context,
    baseURL,
  }) => {
    // Regla de rutas.ts: /trabajos es de profesionales; el cliente vuelve a su inicio.
    await iniciarSesion(context, baseURL!, "tok-cliente");
    await page.goto("/trabajos");
    // En escritorio /inicio redirige a la búsqueda del barrio (mismo criterio que acceso.spec).
    await expect(page).toHaveURL(/\/(inicio|buscar\?barrio=[a-z0-9-]+)$/);
  });

  test("accesibilidad: sin violaciones serias ni críticas", async ({ page, context, baseURL }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos");

    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    const graves = resultado.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves).toEqual([]);
  });

  test("LAB-28: detalle del trabajo muestra info completa y permite postularse con precio y seña", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos/88888888-8888-4888-8888-888888888881");

    // Botón volver
    await expect(page.getByRole("link", { name: "Trabajos" }).first()).toBeVisible();

    // Datos del trabajo y del cliente
    await expect(
      page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
    ).toBeVisible();
    await expect(page.getByText("Laura F.")).toBeVisible();
    await expect(page.getByText(/La dirección se comparte al acordar/)).toBeVisible();

    // Formulario de postulación
    await expect(page.getByRole("heading", { level: 2, name: "Postularme" })).toBeVisible();
    const mensajeInput = page.getByLabel("Tu mensaje para Laura");
    await expect(mensajeInput).toBeVisible();
    const precioInput = page.getByLabel("Precio estimado");
    await expect(precioInput).toBeVisible();
    const senaInput = page.getByLabel("Seña que proponés");
    await expect(senaInput).toBeVisible();

    // Completar y enviar postulación
    await mensajeInput.fill("Puedo ir hoy a las 17 h. Reviso la pérdida y te paso presupuesto.");
    await precioInput.fill("15000");
    await senaInput.fill("3000");
    await page.getByRole("button", { name: "Postularme" }).click();

    // Estado enviado
    await expect(page.getByText("Postulación enviada")).toBeVisible();
    await expect(
      page.getByText("Laura ve tu mensaje y, si te elige, te escribe por WhatsApp."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver más trabajos" })).toBeVisible();
  });

  test("LAB-28: profesional en revisión ve aviso de documentos en el detalle", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno-revision");
    await page.goto("/trabajos/88888888-8888-4888-8888-888888888881");

    await expect(
      page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
    ).toBeVisible();
    await expect(
      page.getByText("Vas a poder postularte cuando aprobemos tus documentos."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Postularme" })).not.toBeVisible();
  });

  test("LAB-28: detalle de trabajo ya postulado muestra datos y permite retirar", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos/88888888-8888-4888-8888-888888888882");

    await expect(page.getByText("Postulación enviada")).toBeVisible();
    await expect(page.getByText("Puedo pasar hoy a la tarde a revisar.")).toBeVisible();

    const botonRetirar = page.getByRole("button", { name: "Retirar mi postulación" });
    await expect(botonRetirar).toBeVisible();
    await botonRetirar.click();

    await expect(page.getByText("¿Seguro que querés retirar tu postulación?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, retirar" }).click();
  });

  test("LAB-28: accesibilidad en /trabajos/[id]", async ({ page, context, baseURL }) => {
    await iniciarSesion(context, baseURL!, "tok-dueno");
    await page.goto("/trabajos/88888888-8888-4888-8888-888888888881");

    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const graves = resultado.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves).toEqual([]);
  });
});
