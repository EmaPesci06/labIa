import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

// LAB-21: camino feliz del panel de verificación del admin, con el Supabase FALSO
// (tests/e2e/apoyo/supabase-falso.cjs). Para correrlo:
//   1. node tests/e2e/apoyo/supabase-falso.cjs                     (LABIA_SUPABASE_FALSO_PUERTO)
//   2. build con NEXT_PUBLIC_SUPABASE_URL=http://localhost:<puerto del falso> y una anon key cualquiera,
//      SUPABASE_SERVICE_ROLE_KEY falsa (solo en el entorno local de la prueba)
//   3. LABIA_E2E_SUPABASE_FALSO=1 LABIA_SUPABASE_FALSO_PUERTO=<puerto> pnpm exec playwright test panel-verificacion
// Sin esas variables se saltea: contra el Supabase real del CI la sesión de admin no existe.
// La sesión viaja por cookie (como en perfil-datos) y el falso decide que el token es de admin.

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const PUERTO_FALSO = process.env.LABIA_SUPABASE_FALSO_PUERTO ?? "54399";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

const ID_EN_REVISION = "22222222-2222-4222-8222-222222222222";
const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const ID_RECHAZADO = "55555555-5555-4555-8555-555555555555";
const VERIF_DNI_FRENTE = "a0000000-0000-4000-8000-000000000001";
const VERIF_ANTECEDENTES = "a0000000-0000-4000-8000-000000000002";

const SOFIA = /Sofía Ríos/;
const MARTIN = /Martín Gómez/;
const DIEGO = /Diego Paz/;

async function iniciarSesionAdmin(contexto: BrowserContext, baseURL: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: "tok-admin",
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

/** Lo que recibió el falso en decidir_documento (cuerpo del RPC), para comprobar lo que mandó la UI. */
async function decisiones(page: Page): Promise<Record<string, unknown>[]> {
  const respuesta = await page.request.get(`http://localhost:${PUERTO_FALSO}/__decisiones`);
  return respuesta.json();
}

async function accesos(page: Page): Promise<{ storage_path: string }[]> {
  const respuesta = await page.request.get(`http://localhost:${PUERTO_FALSO}/__accesos`);
  return respuesta.json();
}

/** Tarjeta de un documento: la más interna que contiene el encabezado y el texto "Enviado". */
function tarjetaDe(page: Page, etiqueta: string): Locator {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: etiqueta, exact: true }) })
    .filter({ hasText: "Enviado" })
    .last();
}

async function capturar(page: Page, nombre: string, tema: "claro" | "oscuro") {
  if (!DIR_CAPTURAS) return;
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR_CAPTURAS}/${nombre}-${ancho}-${tema}.png`, fullPage: true });
}

async function sinViolacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page }).analyze();
  const graves = resultado.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect.soft(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("panel de verificación: camino feliz del admin", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesionAdmin(context, baseURL ?? "");
  });

  test("lista: pestañas con contador, filas y aviso de espera larga", async ({ page }) => {
    await page.goto("/admin/verificaciones");
    await expect(page.getByRole("heading", { level: 1, name: /Verificaciones/ })).toBeVisible();
    await expect(page.getByText("1 pendiente")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Pestañas de verificación" });
    await expect(nav.getByRole("link", { name: "Pendientes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: SOFIA })).toBeVisible();
    await expect(page.getByText("más de 48 h")).toBeVisible();
    await expect(page.getByText("2 documentos por revisar")).toBeVisible();
    await expect(page.getByRole("link", { name: MARTIN })).toHaveCount(0);

    await capturar(page, "panel-pendientes", "claro");
    await sinViolacionesGraves(page);
  });

  test("pestañas Rechazados y Aprobados muestran a cada profesional", async ({ page }) => {
    await page.goto("/admin/verificaciones?pestana=rechazados");
    const nav = page.getByRole("navigation", { name: "Pestañas de verificación" });
    await expect(nav.getByRole("link", { name: "Rechazados" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: DIEGO })).toBeVisible();
    await expect(page.getByRole("link", { name: SOFIA })).toHaveCount(0);

    await nav.getByRole("link", { name: "Aprobados" }).click();
    await expect(page).toHaveURL(/pestana=aprobados/);
    await expect(page.getByRole("link", { name: MARTIN })).toBeVisible();
    await expect(page.getByRole("link", { name: DIEGO })).toHaveCount(0);
  });

  test("las pestañas se usan con teclado", async ({ page }) => {
    await page.goto("/admin/verificaciones");
    const rechazados = page
      .getByRole("navigation", { name: "Pestañas de verificación" })
      .getByRole("link", { name: "Rechazados" });
    await rechazados.focus();
    await expect(rechazados).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/pestana=rechazados/);
  });

  test("abre el detalle del profesional con perfil y checklist", async ({ page }) => {
    await page.goto("/admin/verificaciones");
    await page.getByRole("link", { name: SOFIA }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/verificaciones/${ID_EN_REVISION}$`));

    await expect(page.getByRole("heading", { level: 1, name: "Sofía Ríos" })).toBeVisible();
    await expect(page.getByText("+5492236000002")).toBeVisible();
    await expect(page.getByText("Sin publicar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Checklist de revisión" })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(4);

    await capturar(page, "panel-detalle", "claro");
    await sinViolacionesGraves(page);
  });

  test("ver documento pide la URL firmada al abrir y registra el acceso", async ({ page }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const frente = tarjetaDe(page, "DNI (frente)");

    // Antes de tocar el botón no hay imagen ni URL en el HTML.
    await expect(frente.getByRole("img")).toHaveCount(0);
    await frente.getByRole("button", { name: "Ver documento" }).click();

    const imagen = frente.getByRole("img", { name: "Documento: DNI (frente)" });
    await expect(imagen).toBeVisible();
    await expect(frente.getByText("Enlace válido por 60 segundos.")).toBeVisible();
    await expect
      .poll(async () => (await accesos(page)).some((a) => a.storage_path.includes("dni_frente")))
      .toBe(true);

    await capturar(page, "panel-documento", "claro");
    await sinViolacionesGraves(page);
  });

  test("el certificado de antecedentes (PDF) se muestra en un visor", async ({ page }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const antecedentes = tarjetaDe(page, "Certificado de antecedentes");
    await antecedentes.getByRole("button", { name: "Ver documento" }).click();
    await expect(antecedentes.getByTitle("Documento: Certificado de antecedentes")).toBeVisible();
  });

  test("aprobar un documento pendiente", async ({ page }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const frente = tarjetaDe(page, "DNI (frente)");
    await frente.getByRole("button", { name: "Aprobar", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "Documento aprobado." })).toBeVisible();
    await expect
      .poll(async () =>
        (await decisiones(page)).some(
          (d) => d.p_verificacion === VERIF_DNI_FRENTE && d.p_aprobar === true,
        ),
      )
      .toBe(true);
  });

  test("rechazar con un motivo de la lista", async ({ page }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const antecedentes = tarjetaDe(page, "Certificado de antecedentes");

    await antecedentes.getByRole("button", { name: "Rechazar…" }).click();
    await antecedentes.getByLabel("Motivo del rechazo").selectOption("Foto borrosa");
    await antecedentes.getByRole("button", { name: "Confirmar rechazo" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Documento rechazado. Le avisamos por email." }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        (await decisiones(page)).some(
          (d) =>
            d.p_verificacion === VERIF_ANTECEDENTES &&
            d.p_aprobar === false &&
            d.p_motivo === "Foto borrosa",
        ),
      )
      .toBe(true);
  });

  test("rechazar con 'Otro' sin texto muestra el error junto al campo y no decide", async ({
    page,
  }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const antecedentes = tarjetaDe(page, "Certificado de antecedentes");

    await antecedentes.getByRole("button", { name: "Rechazar…" }).click();
    await antecedentes.getByLabel("Motivo del rechazo").selectOption("Otro");
    await antecedentes.getByRole("button", { name: "Confirmar rechazo" }).click();

    const detalle = antecedentes.getByLabel("Detalle (opcional; obligatorio con Otro)");
    await expect(detalle).toHaveAttribute("aria-invalid", "true");
    await expect(antecedentes.getByText("Contanos el motivo en el texto.")).toBeVisible();
    await expect(detalle).toHaveAccessibleDescription(/Contanos el motivo en el texto./);

    const enviadas = await decisiones(page);
    expect(enviadas.some((d) => d.p_motivo === "Otro" && !d.p_detalle)).toBe(false);
  });

  test("rechazar con 'Otro' y texto guarda el motivo con el detalle", async ({ page }) => {
    await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
    const antecedentes = tarjetaDe(page, "Certificado de antecedentes");

    await antecedentes.getByRole("button", { name: "Rechazar…" }).click();
    await antecedentes.getByLabel("Motivo del rechazo").selectOption("Otro");
    await antecedentes
      .getByLabel("Detalle (opcional; obligatorio con Otro)")
      .fill("Falta la hoja 2 del certificado");
    await antecedentes.getByRole("button", { name: "Confirmar rechazo" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Documento rechazado" })).toBeVisible();
    await expect
      .poll(async () =>
        (await decisiones(page)).some(
          (d) => d.p_motivo === "Otro" && d.p_detalle === "Falta la hoja 2 del certificado",
        ),
      )
      .toBe(true);
  });

  test("el detalle de un profesional con documentos aprobados no ofrece decidir", async ({
    page,
  }) => {
    await page.goto(`/admin/verificaciones/${ID_PUBLICADO}`);
    await expect(page.getByText("Perfil publicado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprobar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver documento" }).first()).toBeVisible();
  });

  test("capturas del panel en claro y oscuro", async ({ page }) => {
    test.skip(!DIR_CAPTURAS, "Sin LABIA_CAPTURAS_DIR no se sacan capturas");
    for (const [modo, tema] of [
      ["light", "claro"],
      ["dark", "oscuro"],
    ] as const) {
      await page.emulateMedia({ colorScheme: modo });

      await page.goto("/admin/verificaciones");
      await expect(page.getByRole("link", { name: SOFIA })).toBeVisible();
      await capturar(page, "panel-pendientes", tema);

      await page.goto(`/admin/verificaciones/${ID_EN_REVISION}`);
      await expect(page.getByRole("heading", { level: 1, name: "Sofía Ríos" })).toBeVisible();
      await capturar(page, "panel-detalle", tema);
      await tarjetaDe(page, "DNI (frente)").getByRole("button", { name: "Ver documento" }).click();
      await expect(
        tarjetaDe(page, "DNI (frente)").getByRole("img", { name: "Documento: DNI (frente)" }),
      ).toBeVisible();
      await capturar(page, "panel-documento", tema);

      await page.goto(`/admin/verificaciones/${ID_RECHAZADO}`);
      await expect(page.getByRole("heading", { level: 1, name: "Diego Paz" })).toBeVisible();
      await capturar(page, "panel-rechazado", tema);
    }
  });
});
