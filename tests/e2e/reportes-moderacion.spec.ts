import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

// LAB-32: reportes y moderación con el Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
// Cubre: reportar perfil, trabajo y reseña (hoja, motivos, límite de detalle, errores junto al mensaje);
// /admin/reportes (lista, marcar en revisión, ocultar reseña, suspender con motivo, reactivar) y
// /suspendida, donde la persona suspendida ve el motivo.
// Para correr: ver perfil-datos.spec.ts (mismo servidor falso y mismos puertos).
// Sin LABIA_E2E_SUPABASE_FALSO=1 se saltean: no pueden correr contra el Supabase real del CI.
//
// El estado se reinicia en globalSetup (apoyo/reiniciar-falso.ts), antes de todos los proyectos.
// Reparto entre proyectos: `celular` y `escritorio` corren en paralelo sobre el mismo falso, así que
// cada uno reporta con su propia cuenta y sobre sus propios objetivos. Solo `escritorio` reinicia el
// estado y hace las acciones de admin (que lo cambian); `celular` hace el panel de admin en solo lectura.

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

const ID_MODERADO = "99999999-9999-4999-8999-999999999999";
const TRABAJO_OLOR_GAS = "88888888-8888-4888-8888-888888888881";
const TRABAJO_OTRO = "88888888-8888-4888-8888-888888888882";

// Textos únicos de los datos de partida: así cada prueba encuentra su fila aunque otra cree reportes.
const DETALLE_ESTAFA = "Me pidió una seña por transferencia fuera de la app.";
const DETALLE_DEL_CLIENTE = "Me pidió una seña por fuera de la app.";
const RESENA_LLEGO_TARDE = "Llegó tarde y dejó todo sin limpiar.";
const RESENA_CAMBIO_PRESUPUESTO = "Cambió el presupuesto sin avisarme.";
const RESENA_OCULTABLE = "Presupuesto inflado y trato agresivo.";

const MOTIVO_ESTAFA = "Intento de estafa o pedido de pago por fuera";
const MOTIVO_CONTENIDO = "Contenido inapropiado";
const MOTIVO_SUSPENSION = "Pidió una seña por fuera de la app, según el reporte verificado.";
const YA_REPORTADO = "Ya enviaste un reporte sobre este contenido.";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

type Token =
  | "tok-cliente"
  | "tok-cliente-limite"
  | "tok-cliente-despublicado"
  | "tok-dueno"
  | "tok-dueno-revision"
  | "tok-admin"
  | "tok-moderado";

const base64url = (texto: string) => Buffer.from(texto).toString("base64url");

/** Cookie de sesión de @supabase/ssr (`sb-<host>-auth-token`); el falso reconoce el access_token. */
async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: Token) {
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
      value: `base64-${base64url(JSON.stringify(sesion))}`,
      url: baseURL,
    },
  ]);
}

/** Una página con la sesión del token dado, en su propio contexto (se cierra al final de la prueba). */
async function sesionDe(browser: Browser, baseURL: string, token: Token) {
  const contexto = await browser.newContext({
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  await iniciarSesion(contexto, baseURL, token);
  return { contexto, page: await contexto.newPage() };
}

async function capturar(page: Page, nombre: string, tema: "claro" | "oscuro") {
  if (!DIR_CAPTURAS) return;
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `${DIR_CAPTURAS}/${nombre}-${ancho}-${tema}.png`, fullPage: true });
}

/** El botón visible con ese nombre (el perfil tiene uno para celular y otro para escritorio). */
function botonVisible(page: Page, nombre: string) {
  return page.getByRole("button", { name: nombre, exact: true }).filter({ visible: true });
}

/** La reseña que contiene ese texto. */
function bloqueDeResena(page: Page, texto: string) {
  // El texto de la reseña y su botón son hermanos dentro del mismo bloque.
  return page.getByText(texto, { exact: true }).locator("xpath=..");
}

/** La hoja de reporte: su título cambia a "Reporte enviado" al confirmar, así que se busca por rol. */
function hojaDeReporte(page: Page) {
  return page.getByRole("dialog");
}

function graves(resultado: { violations: { impact?: string | null }[] }) {
  return resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
}

function soloEscritorio(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== "escritorio", "Cambia el estado compartido: solo escritorio");
}

test.describe("reportes del cliente y del profesional", () => {
  test("reportar un perfil: motivo obligatorio, detalle con límite y confirmación", async ({
    page,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string;
    const escritorio = testInfo.project.name === "escritorio";
    await iniciarSesion(
      page.context(),
      baseURL,
      escritorio ? "tok-cliente" : "tok-cliente-despublicado",
    );
    await page.goto(`/profesionales/${ID_MODERADO}`);

    await botonVisible(page, "Reportar perfil").click();
    const hoja = hojaDeReporte(page);
    await expect(hoja).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();

    await hoja.getByLabel(MOTIVO_ESTAFA).check();
    await expect(hoja.getByRole("button", { name: "Enviar reporte" })).toBeEnabled();

    const detalle = hoja.getByLabel("Detalle opcional");
    await detalle.fill("x".repeat(600));
    await expect(detalle).toHaveValue("x".repeat(500));
    await expect(hoja.getByText("500 / 500")).toBeVisible();
    await detalle.fill(DETALLE_DEL_CLIENTE);

    await capturar(page, "reporte-perfil", "claro");
    await hoja.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(hoja.getByText("Gracias por avisarnos.")).toBeVisible();
    await expect(hoja.getByText("No le avisamos a la otra persona")).toBeVisible();
    await hoja.getByRole("button", { name: "Entendido" }).click();
    await expect(hoja).toBeHidden();

    // Segundo reporte sobre el mismo perfil (tras recargar): el servidor lo rechaza junto al formulario.
    await page.reload();
    await botonVisible(page, "Reportar perfil").click();
    await hoja.getByLabel(MOTIVO_CONTENIDO).check();
    await hoja.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(hoja.getByRole("alert").filter({ hasText: YA_REPORTADO })).toBeVisible();
  });

  test("el teclado abre la hoja, la cierra con Esc y devuelve el foco al botón", async ({
    page,
  }, testInfo) => {
    await iniciarSesion(
      page.context(),
      testInfo.project.use.baseURL as string,
      "tok-cliente-limite",
    );
    await page.goto(`/profesionales/${ID_MODERADO}`);

    const boton = botonVisible(page, "Reportar perfil");
    await boton.focus();
    await page.keyboard.press("Enter");
    const hoja = hojaDeReporte(page);
    await expect(hoja).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(hoja).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test("reportar una reseña ajena", async ({ page }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string;
    const escritorio = testInfo.project.name === "escritorio";
    await iniciarSesion(
      page.context(),
      baseURL,
      escritorio ? "tok-cliente" : "tok-cliente-despublicado",
    );
    await page.goto(`/profesionales/${ID_MODERADO}`);

    await bloqueDeResena(page, escritorio ? RESENA_LLEGO_TARDE : RESENA_CAMBIO_PRESUPUESTO)
      .getByRole("button", { name: "Reportar", exact: true })
      .click();
    const hoja = hojaDeReporte(page);
    await expect(hoja).toBeVisible();
    await hoja.getByLabel(MOTIVO_CONTENIDO).check();
    await capturar(page, "reporte-resena", "claro");
    await hoja.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(hoja.getByText("Gracias por avisarnos.")).toBeVisible();
  });

  test("no se puede reportar la propia reseña", async ({ page }, testInfo) => {
    soloEscritorio(testInfo);
    await iniciarSesion(
      page.context(),
      testInfo.project.use.baseURL as string,
      "tok-cliente-despublicado",
    );
    await page.goto(`/profesionales/${ID_MODERADO}`);

    await bloqueDeResena(page, RESENA_LLEGO_TARDE)
      .getByRole("button", { name: "Reportar", exact: true })
      .click();
    const hoja = hojaDeReporte(page);
    await hoja.getByLabel(MOTIVO_CONTENIDO).check();
    await hoja.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(
      hoja.getByRole("alert").filter({ hasText: "No podés reportar tu propia reseña." }),
    ).toBeVisible();
  });

  test("la hoja de reporte pasa axe en claro y en oscuro", async ({ page }, testInfo) => {
    await iniciarSesion(
      page.context(),
      testInfo.project.use.baseURL as string,
      "tok-cliente-limite",
    );
    await page.goto(`/profesionales/${ID_MODERADO}`);

    for (const tema of ["claro", "oscuro"] as const) {
      await page.emulateMedia({ colorScheme: tema === "oscuro" ? "dark" : "light" });
      await botonVisible(page, "Reportar perfil").click();
      const hoja = hojaDeReporte(page);
      await expect(hoja).toBeVisible();
      await hoja.getByLabel(MOTIVO_ESTAFA).check();
      await capturar(page, "reporte-hoja", tema);
      // Solo la hoja: la página de fondo queda atenuada por el velo y axe mide ese color mezclado.
      const resultado = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(graves(resultado), tema).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(hoja).toBeHidden();
    }
  });

  test("reportar un trabajo desde el panel del profesional", async ({ page }, testInfo) => {
    const escritorio = testInfo.project.name === "escritorio";
    await iniciarSesion(
      page.context(),
      testInfo.project.use.baseURL as string,
      escritorio ? "tok-dueno" : "tok-dueno-revision",
    );
    await page.goto(`/trabajos/${escritorio ? TRABAJO_OLOR_GAS : TRABAJO_OTRO}`);

    await botonVisible(page, "Reportar trabajo").click();
    const hoja = hojaDeReporte(page);
    await hoja.getByLabel(MOTIVO_ESTAFA).check();
    await hoja.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(hoja.getByText("Gracias por avisarnos.")).toBeVisible();
  });
});

test.describe("moderación del admin", () => {
  test.describe.configure({ mode: "serial" });

  test("la lista de reportes carga y pasa axe (solo lectura)", async ({ browser }, testInfo) => {
    const admin = await sesionDe(browser, testInfo.project.use.baseURL as string, "tok-admin");
    await admin.page.goto("/admin/reportes");
    await expect(admin.page.getByRole("heading", { name: "Reportes y moderación" })).toBeVisible();
    await expect(admin.page.getByText(DETALLE_ESTAFA)).toBeVisible();

    expect(graves(await new AxeBuilder({ page: admin.page }).analyze())).toEqual([]);
    await capturar(admin.page, "admin-reportes", "claro");

    await admin.page.emulateMedia({ colorScheme: "dark" });
    await admin.page.reload();
    await expect(admin.page.getByRole("heading", { name: "Reportes y moderación" })).toBeVisible();
    expect(graves(await new AxeBuilder({ page: admin.page }).analyze())).toEqual([]);
    await capturar(admin.page, "admin-reportes", "oscuro");
    await admin.contexto.close();
  });

  test("un profesional no ve el panel", async ({ browser }, testInfo) => {
    const profesional = await sesionDe(
      browser,
      testInfo.project.use.baseURL as string,
      "tok-dueno",
    );
    const respuesta = await profesional.page.goto("/admin/reportes");
    expect(respuesta?.status()).toBe(404);
    await profesional.contexto.close();
  });

  test("marcar un reporte en revisión lo mueve a su pestaña", async ({ browser }, testInfo) => {
    soloEscritorio(testInfo);
    const admin = await sesionDe(browser, testInfo.project.use.baseURL as string, "tok-admin");
    await admin.page.goto("/admin/reportes");
    const fila = admin.page.getByRole("listitem").filter({ hasText: DETALLE_ESTAFA });
    await fila.getByRole("button", { name: "Marcar en revisión" }).click();
    await admin.page.getByRole("link", { name: /En revisión/ }).click();
    await expect(admin.page.getByRole("listitem").filter({ hasText: DETALLE_ESTAFA })).toHaveCount(
      1,
    );
    await admin.contexto.close();
  });

  test("ocultar una reseña la borra: deja de verse en el perfil", async ({ browser }, testInfo) => {
    soloEscritorio(testInfo);
    const baseURL = testInfo.project.use.baseURL as string;
    const admin = await sesionDe(browser, baseURL, "tok-admin");
    await admin.page.goto("/admin/reportes");
    const fila = admin.page.getByRole("listitem").filter({ hasText: RESENA_OCULTABLE });
    await fila.getByRole("button", { name: "Ocultar reseña" }).click();
    // Al borrarse, el reporte pasa a mostrar que el contenido ya no existe.
    await expect(admin.page.getByText("Reseña (ocultada o eliminada)").first()).toBeVisible();

    const cliente = await sesionDe(browser, baseURL, "tok-cliente");
    await cliente.page.goto(`/profesionales/${ID_MODERADO}`);
    await expect(cliente.page.getByText(RESENA_LLEGO_TARDE)).toBeVisible();
    await expect(cliente.page.getByText(RESENA_OCULTABLE)).toHaveCount(0);
    await cliente.contexto.close();
    await admin.contexto.close();
  });

  test("suspender exige un motivo y luego la cuenta queda suspendida", async ({
    browser,
  }, testInfo) => {
    soloEscritorio(testInfo);
    const admin = await sesionDe(browser, testInfo.project.use.baseURL as string, "tok-admin");
    await admin.page.goto("/admin/reportes");
    await admin.page.goto("/admin/reportes?pestana=en_revision");
    const fila = admin.page.getByRole("listitem").filter({ hasText: DETALLE_ESTAFA });
    await fila.getByRole("button", { name: /Suspender cuenta/ }).click();

    const modal = admin.page.getByRole("dialog", { name: "Suspender cuenta de Tomás Ruiz" });
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Confirmar suspensión" }).click();
    await expect(modal.getByText("Ingresá un motivo de al menos 3 caracteres.")).toBeVisible();

    await modal.getByLabel("Motivo de la suspensión (obligatorio)").fill(MOTIVO_SUSPENSION);
    await capturar(admin.page, "admin-suspender", "claro");
    await modal.getByRole("button", { name: "Confirmar suspensión" }).click();
    await expect(modal).toBeHidden();
    await expect(fila.getByText("Cuenta suspendida")).toBeVisible();
    await expect(fila.getByRole("button", { name: "Reactivar cuenta" })).toBeVisible();
    await admin.contexto.close();
  });

  test("la persona suspendida ve el motivo en /suspendida", async ({ browser }, testInfo) => {
    soloEscritorio(testInfo);
    const moderado = await sesionDe(
      browser,
      testInfo.project.use.baseURL as string,
      "tok-moderado",
    );
    await moderado.page.goto("/inicio");
    await expect(moderado.page).toHaveURL(/\/suspendida$/);
    await expect(
      moderado.page.getByRole("heading", { name: "Tu cuenta fue suspendida" }),
    ).toBeVisible();
    await expect(moderado.page.getByText(MOTIVO_SUSPENSION)).toBeVisible();
    await capturar(moderado.page, "suspendida", "claro");
    expect(graves(await new AxeBuilder({ page: moderado.page }).analyze())).toEqual([]);
    await moderado.contexto.close();
  });

  test("reactivar la cuenta devuelve el acceso", async ({ browser }, testInfo) => {
    soloEscritorio(testInfo);
    const baseURL = testInfo.project.use.baseURL as string;
    const admin = await sesionDe(browser, baseURL, "tok-admin");
    await admin.page.goto("/admin/reportes?pestana=en_revision");
    const fila = admin.page.getByRole("listitem").filter({ hasText: DETALLE_ESTAFA });
    await fila.getByRole("button", { name: "Reactivar cuenta" }).click();
    await expect(fila.getByText("Cuenta suspendida")).toHaveCount(0);

    const moderado = await sesionDe(browser, baseURL, "tok-moderado");
    await moderado.page.goto("/inicio");
    await expect(moderado.page).not.toHaveURL(/\/suspendida$/);
    await moderado.contexto.close();
    await admin.contexto.close();
  });
});
