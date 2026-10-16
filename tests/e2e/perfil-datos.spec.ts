import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// LAB-24: perfil público y edición, con un Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
// Sirve en máquinas sin Docker. Para correr:
//   1. node tests/e2e/apoyo/supabase-falso.cjs                       (puerto 54399)
//   2. construir y levantar con NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 y una anon key
//      cualquiera (la sesión real viaja por cookie y el falso decide quién mira por el token)
//   3. LABIA_E2E_SUPABASE_FALSO=1 pnpm exec playwright test perfil-datos
// Sin esa variable las pruebas se saltean: no pueden correr contra el Supabase real del CI.
// La RLS y la función `perfil_profesional` se prueban en SQL (perfil_profesional.test.sql).

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const ID_EN_REVISION = "22222222-2222-4222-8222-222222222222";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

type Token = "tok-cliente" | "tok-dueno" | "tok-dueno-revision";

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

async function capturar(page: Page, nombre: string, tema: "claro" | "oscuro") {
  if (!DIR_CAPTURAS) return;
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: `${DIR_CAPTURAS}/${nombre}-${ancho}-${tema}.png`,
    fullPage: true,
  });
}

async function sinViolacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page }).analyze();
  const graves = resultado.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect.soft(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

// La lista es hermana del encabezado (dentro de la misma sección), no hija de su contenedor.
const listaResenas = (page: Page) =>
  page
    .getByRole("heading", { level: 2, name: "Reseñas" })
    .locator("xpath=ancestor::section[1]")
    .getByRole("listitem");

test.describe("perfil público: visitante sin sesión", () => {
  test("muestra la inicial del apellido, solo insignias y manda a ingresar para contactar", async ({
    page,
  }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    await expect(page.getByRole("heading", { level: 1, name: "Martín G." })).toBeVisible();
    await expect(page.getByText("Gómez")).toHaveCount(0);
    await expect(page.getByText(/a [\d,]+ km/)).toHaveCount(0);

    // Solo insignias: ni número, ni email, ni DNI en la página.
    const insignias = page.getByRole("list", { name: "Verificaciones" }).first();
    await expect(insignias.getByRole("listitem")).toHaveCount(3);
    const html = await page.content();
    expect(html).not.toMatch(/wa\.me|whatsapp\.com/i);
    expect(html).not.toMatch(/mailto:|[\w.]+@[\w-]+\.\w+/);
    expect(html).not.toMatch(/\bDNI\b/);

    const contactar = page.getByRole("link", { name: "Contactar por WhatsApp" }).first();
    await expect(contactar).toHaveAttribute(
      "href",
      `/ingresar?volver=${encodeURIComponent(`/profesionales/${ID_PUBLICADO}`)}`,
    );
    await capturar(page, "perfil-visitante", "claro");
  });

  test("perfil en revisión (no publicado): 404 a terceros", async ({ page }) => {
    await page.goto(`/profesionales/${ID_EN_REVISION}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/ingresar/);
  });

  test("reseñas: 3 de entrada, Ver todas y Ver más hasta el final; autor borrado", async ({
    page,
  }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    const reseñas = listaResenas(page);
    await expect(reseñas).toHaveCount(3);
    await expect(page.getByText("Reseña número 1", { exact: true })).toBeVisible();
    // Las dos primeras son de las cuentas de prueba de LAB-31 (editable y vencida); después, la número 1.
    await expect(reseñas.nth(0)).toContainText("Diego S.");
    await expect(reseñas.nth(1)).toContainText("Mora V.");
    await expect(reseñas.nth(2)).toContainText("Laura F.");

    await page.getByRole("button", { name: "Ver todas (27)" }).click();
    await expect(reseñas).toHaveCount(13);
    // La reseña número 2 tiene el autor borrado (autor_id null en el falso).
    await expect(reseñas.nth(3)).toContainText("Cliente de LabÍA");
    await page.getByRole("button", { name: "Ver más reseñas (14)" }).click();
    await expect(reseñas).toHaveCount(23);
    await page.getByRole("button", { name: "Ver más reseñas (4)" }).click();
    await expect(reseñas).toHaveCount(27);
    await expect(page.getByRole("button", { name: /Ver (todas|más)/ })).toHaveCount(0);
    await expect(page.getByText("Reseña número 25", { exact: true })).toBeVisible();
  });
});

test.describe("perfil público: cliente con sesión", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-cliente");
  });

  test("ve el nombre completo y la distancia; el contacto no es un enlace de ingreso", async ({
    page,
  }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    await expect(page.getByRole("heading", { level: 1, name: "Martín Gómez" })).toBeVisible();
    await expect(page.getByText("a 1,2 km").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Contactar por WhatsApp" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Contactar por WhatsApp" }).first(),
    ).toBeVisible();
    const html = await page.content();
    expect(html).not.toMatch(/wa\.me|whatsapp\.com/i);
    expect(html).not.toMatch(/\bDNI\b/);
    await capturar(page, "perfil-cliente", "claro");
  });

  test("perfil en revisión: 404 también para un cliente", async ({ page }) => {
    await page.goto(`/profesionales/${ID_EN_REVISION}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();
  });

  test("/cuenta/perfil no es para clientes: vuelve a /cuenta", async ({ page }) => {
    await page.goto("/cuenta/perfil");
    await expect(page).toHaveURL(/\/cuenta$/);
  });
});

// LAB-25: contacto por WhatsApp desde el perfil. El número del profesional (falso) no está en el HTML
// del perfil: solo aparece cuando el cliente confirma "Abrir WhatsApp".
const WHATSAPP_FALSO = "5492235550123";

test.describe("contacto por WhatsApp: cliente con sesión", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-cliente");
  });

  test("la hoja trae los consejos, Cancelar la cierra y Abrir WhatsApp abre wa.me con el mensaje", async ({
    page,
    context,
  }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    expect(await page.content()).not.toContain(WHATSAPP_FALSO);

    const abrirHoja = page
      .getByRole("button", { name: "Contactar por WhatsApp" })
      .filter({ visible: true })
      .first();
    await abrirHoja.click();

    const hoja = page.getByRole("dialog", { name: "Antes de contactar" });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByRole("listitem")).toHaveCount(4);
    await expect(hoja.getByText("Pedí el presupuesto por escrito.")).toBeVisible();
    await capturar(page, "contacto-hoja", "claro");
    await sinViolacionesGraves(page);

    await hoja.getByRole("button", { name: "Cancelar" }).click();
    await expect(hoja).toBeHidden();

    // Cancelar no abre nada. Interceptamos wa.me para no salir a internet al confirmar.
    await context.route("https://wa.me/**", (ruta) =>
      ruta.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }),
    );
    const pestana = context.waitForEvent("page");
    await abrirHoja.click();
    await hoja.getByRole("button", { name: "Abrir WhatsApp" }).click();
    const wa = await pestana;
    await expect(wa).toHaveURL(new RegExp(`^https://wa\\.me/${WHATSAPP_FALSO}\\?text=`));
    const texto = decodeURIComponent(new URL(wa.url()).searchParams.get("text") ?? "");
    expect(texto).toContain("Hola Martín Gómez, te encontré en LabÍA.");
    expect(texto).toContain("Necesito un/a gasista en Centro.");
  });

  test("el profesional sin sesión de cliente no ve el botón de contacto en el perfil de otro", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.clearCookies();
    await iniciarSesion(context, baseURL ?? "", "tok-dueno-revision");
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    await expect(page.getByRole("heading", { level: 1, name: "Martín Gómez" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contactar por WhatsApp" })).toHaveCount(0);
    expect(await page.content()).not.toContain(WHATSAPP_FALSO);
  });
});

test.describe("perfil público: el dueño", () => {
  test("publicado: banner, Editar perfil y sin botón de contacto", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-dueno");
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    await expect(
      page.getByRole("status").filter({ hasText: "Tu perfil está publicado." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar perfil" }).first()).toBeVisible();
    await expect(page.getByText("Contactar por WhatsApp")).toHaveCount(0);
    await capturar(page, "perfil-duenio", "claro");
  });

  test("en revisión: lo ve con el banner de revisión", async ({ page, context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-dueno-revision");
    await page.goto(`/profesionales/${ID_EN_REVISION}`);
    await expect(page.getByRole("heading", { level: 1, name: "Sofía Ríos" })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Tu perfil está en revisión" }),
    ).toBeVisible();
    await expect(page.getByText("Todavía no tiene reseñas.")).toBeVisible();
    await capturar(page, "perfil-revision", "claro");
  });

  test("edición: valida, guarda y enlaza a Ver mi perfil", async ({ page, context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-dueno");
    await page.goto("/cuenta/perfil");
    await expect(page.getByRole("heading", { level: 1, name: "Editar perfil" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Gas" })).toBeChecked();

    // Sin oficios: error en castellano al lado del campo. El falso tiene gas y plomería: hay que
    // desmarcar los dos para quedar sin ninguno.
    await page.getByRole("checkbox", { name: "Gas" }).uncheck();
    await page.getByRole("checkbox", { name: "Plomería" }).uncheck();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText(/al menos un oficio/i)).toBeVisible();

    await page.getByRole("checkbox", { name: "Plomería" }).check();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Guardamos los cambios de tu perfil.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver mi perfil/ })).toHaveAttribute(
      "href",
      `/profesionales/${ID_PUBLICADO}`,
    );
    await capturar(page, "editar-perfil", "claro");
  });
});

for (const tema of ["light", "dark"] as const) {
  test.describe(`accesibilidad (axe) en ${tema === "dark" ? "oscuro" : "claro"}`, () => {
    test.use({ colorScheme: tema });

    test("perfil de visitante, de cliente y del dueño, y edición", async ({
      page,
      context,
      baseURL,
    }) => {
      const nombreTema = tema === "dark" ? "oscuro" : "claro";
      await page.goto(`/profesionales/${ID_PUBLICADO}`);
      await expect(page.getByRole("heading", { level: 1, name: "Martín G." })).toBeVisible();
      await capturar(page, "perfil-visitante", nombreTema);
      await sinViolacionesGraves(page);

      await iniciarSesion(context, baseURL ?? "", "tok-cliente");
      await page.goto(`/profesionales/${ID_PUBLICADO}`);
      await expect(page.getByRole("heading", { level: 1, name: "Martín Gómez" })).toBeVisible();
      await capturar(page, "perfil-cliente", nombreTema);
      await sinViolacionesGraves(page);

      // LAB-25: la hoja "Antes de contactar" abierta también tiene que pasar axe y verse en ambos temas.
      await page
        .getByRole("button", { name: "Contactar por WhatsApp" })
        .filter({ visible: true })
        .first()
        .click();
      await expect(page.getByRole("dialog", { name: "Antes de contactar" })).toBeVisible();
      await capturar(page, "contacto-hoja", nombreTema);
      await sinViolacionesGraves(page);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Antes de contactar" })).toBeHidden();

      await context.clearCookies();
      await iniciarSesion(context, baseURL ?? "", "tok-dueno");
      await page.goto(`/profesionales/${ID_PUBLICADO}`);
      await expect(page.getByRole("status").first()).toBeVisible();
      await capturar(page, "perfil-duenio", nombreTema);
      await sinViolacionesGraves(page);

      await page.goto("/cuenta/perfil");
      await expect(page.getByRole("heading", { level: 1, name: "Editar perfil" })).toBeVisible();
      await capturar(page, "editar-perfil", nombreTema);
      await sinViolacionesGraves(page);
    });
  });
}
