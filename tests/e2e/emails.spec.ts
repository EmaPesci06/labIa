import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

test("la baja con un enlace inválido avisa y no pide ingresar", async ({ page }) => {
  await page.goto("/baja?t=token-roto");
  await expect(
    page.getByRole("heading", { level: 1, name: "Darte de baja de los emails" }),
  ).toBeVisible();
  await expect(page.getByText("Este enlace no es válido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar la baja" })).toHaveCount(0);
});

test("los crons rechazan pedidos sin el secreto", async ({ request }) => {
  for (const ruta of ["/api/cron/trabajos-cerca", "/api/cron/pedir-resena"]) {
    const respuesta = await request.get(ruta);
    expect(respuesta.status()).toBe(401);
  }
});

test("la baja de un clic por POST rechaza un token inválido", async ({ request }) => {
  const respuesta = await request.post("/api/baja?t=token-roto");
  expect(respuesta.status()).toBe(400);
});

// ---- Ampliación e2e (labia-e2e) ----
const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;
// Mismo secreto que el servidor base en playwright.config.ts.
const SECRETO = "secreto-solo-para-e2e-de-32-caracteres-o-mas";
const USUARIO = "11111111-1111-4111-8111-111111111111";

function token(categoria: string, secreto = SECRETO): string {
  const cuerpo = Buffer.from(`${USUARIO}|${categoria}`).toString("base64url");
  const firma = createHmac("sha256", secreto).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

test.describe("/baja con token válido", () => {
  for (const [categoria, texto] of [
    ["trabajos_cerca", "el resumen diario de trabajos nuevos"],
    ["novedades", "los recordatorios y novedades"],
  ] as const) {
    test(`pide confirmar la baja de ${categoria} sin ingresar`, async ({ page }) => {
      await page.goto(`/baja?t=${token(categoria)}`);
      await expect(page.getByText(`Vas a dejar de recibir ${texto}`)).toBeVisible();
      await expect(page.getByRole("button", { name: "Confirmar la baja" })).toBeVisible();
      await expect(page).toHaveURL(/\/baja\?t=/);
    });
  }

  test("un token firmado con otro secreto es inválido", async ({ page }) => {
    await page.goto(`/baja?t=${token("novedades", "otro-secreto-tambien-de-32-caracteres-xx")}`);
    await expect(page.getByText("Este enlace no es válido")).toBeVisible();
  });

  test("el estado de baja hecha confirma sin pedir nada más", async ({ page }) => {
    await page.goto("/baja?listo=novedades");
    await expect(page.getByRole("status")).toContainText("Ya no vas a recibir");
    await expect(page.getByRole("link", { name: "Ir a LabÍA" })).toBeVisible();
  });

  test("el POST de un clic rechaza un token con la firma alterada", async ({ request }) => {
    const alterado = `${token("novedades").slice(0, -2)}xx`;
    const respuesta = await request.post(`/api/baja?t=${alterado}`);
    expect(respuesta.status()).toBe(400);
  });

  test("se llega a Confirmar con teclado", async ({ page }) => {
    await page.goto(`/baja?t=${token("novedades")}`);
    const boton = page.getByRole("button", { name: "Confirmar la baja" });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      if (await boton.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(boton).toBeFocused();
  });
});

test.describe("/cuenta/emails", () => {
  test("profesional ve los dos interruptores y guarda", async ({ page }) => {
    await page.goto(`${URL_PROFESIONAL}/cuenta/emails`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Preferencias de email" }),
    ).toBeVisible();
    const cerca = page.getByRole("switch", { name: /Trabajos nuevos cerca tuyo/ });
    const novedades = page.getByRole("switch", { name: /Novedades y recordatorios/ });
    await expect(cerca).toBeChecked();
    await expect(novedades).toBeChecked();
    await novedades.click();
    await expect(novedades).not.toBeChecked();
    // Con o sin Supabase, la sesión falsa no guarda: tiene que avisar, no fallar en silencio.
    // Se reintenta el clic por si cae antes de que la página termine de hidratarse.
    await expect(async () => {
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(
        page.getByText(
          /Ingresá de nuevo para cambiar tus preferencias|No pudimos guardar tus preferencias/,
        ),
      ).toBeVisible({ timeout: 2000 });
    }).toPass();
  });

  test("el cliente no ve el resumen de trabajos nuevos", async ({ page }) => {
    await page.goto(`${URL_CLIENTE}/cuenta/emails`);
    await expect(page.getByRole("switch", { name: /Novedades y recordatorios/ })).toBeVisible();
    await expect(page.getByRole("switch", { name: /Trabajos nuevos cerca tuyo/ })).toHaveCount(0);
  });

  test("un visitante no puede ver las preferencias", async ({ page }) => {
    await page.goto("/cuenta/emails");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("los interruptores se operan con teclado", async ({ page }) => {
    await page.goto(`${URL_PROFESIONAL}/cuenta/emails`);
    const cerca = page.getByRole("switch", { name: /Trabajos nuevos cerca tuyo/ });
    await cerca.focus();
    await page.keyboard.press("Space");
    await expect(cerca).not.toBeChecked();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("switch", { name: /Novedades y recordatorios/ })).toBeFocused();
  });

  test("los interruptores miden al menos 44 px de alto", async ({ page }) => {
    await page.goto(`${URL_PROFESIONAL}/cuenta/emails`);
    const caja = await page
      .getByRole("switch", { name: /Novedades y recordatorios/ })
      .locator("xpath=ancestor::label")
      .boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("accesibilidad de emails", () => {
  for (const esquema of ["light", "dark"] as const) {
    test.describe(esquema, () => {
      test.use({ colorScheme: esquema });

      test(`/baja válida sin violaciones (${esquema})`, async ({ page }) => {
        await page.goto(`/baja?t=${token("novedades")}`);
        await page.waitForLoadState("networkidle");
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });

      test(`/baja inválida sin violaciones (${esquema})`, async ({ page }) => {
        await page.goto("/baja?t=roto");
        await page.waitForLoadState("networkidle");
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });

      test(`/cuenta/emails sin violaciones (${esquema})`, async ({ page }) => {
        await page.goto(`${URL_PROFESIONAL}/cuenta/emails`);
        await page.waitForLoadState("networkidle");
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    });
  }
});
