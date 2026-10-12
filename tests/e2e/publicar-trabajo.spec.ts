import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
// Sesión falsa de cliente (sin base de datos: la publicación se simula) y de profesional.
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;

const esEscritorio = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe("publicar un trabajo (cliente)", () => {
  test.use({ baseURL: URL_CLIENTE });

  test("publicación completa: valida, muestra errores y redirige con el mensaje", async ({
    page,
  }) => {
    await page.goto("/trabajos/nuevo?oficio=gas");
    await expect(
      page.getByRole("heading", { level: 1, name: "Publicar un trabajo" }),
    ).toBeVisible();
    // ?oficio= preselecciona el chip.
    await expect(page.getByRole("radio", { name: "Gas" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Lo antes posible" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Vacío: errores en castellano al lado del campo.
    await page.getByRole("button", { name: "Publicar trabajo" }).click();
    await expect(page.getByText("El título tiene que tener al menos 5 caracteres.")).toBeVisible();
    await expect(page.getByText("Contá un poco más: al menos 20 caracteres.")).toBeVisible();

    // Teléfono en el texto.
    await page.getByLabel("Título").fill("Olor a gas en la cocina");
    await page
      .getByLabel("Contá qué pasa")
      .fill("Desde ayer hay olor a gas. Llamame al 223 555 1234 por favor");
    await page.getByRole("button", { name: "Publicar trabajo" }).click();
    await expect(page.getByText(/No pongas tu teléfono acá/)).toBeVisible();

    if (esEscritorio(page)) {
      // La vista previa refleja lo que se escribe.
      await expect(
        page.getByRole("heading", { level: 3, name: "Olor a gas en la cocina" }),
      ).toBeVisible();
    }

    await page
      .getByLabel("Contá qué pasa")
      .fill("Desde ayer hay olor a gas cerca del horno. Ya cerré la llave de paso.");
    await page.getByRole("radio", { name: "Esta semana" }).click();
    await page.getByLabel("Presupuesto estimado (opcional)").fill("25000");
    await page.getByRole("button", { name: "Publicar trabajo" }).click();

    await expect(page).toHaveURL(/\/mis-trabajos\/[0-9a-f-]{36}\?publicado=1/);
    await expect(
      page.getByText("¡Publicado! Te avisamos por email cuando alguien se postule."),
    ).toBeVisible();
  });

  test("sin errores de accesibilidad graves", async ({ page }) => {
    await page.goto("/trabajos/nuevo");
    const resultado = await new AxeBuilder({ page }).analyze();
    expect(
      resultado.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
    ).toEqual([]);
  });

  test("sin errores graves en modo oscuro", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/trabajos/nuevo");
    await expect(page.getByRole("heading", { level: 1, name: "Publicar un trabajo" })).toBeVisible();
    const resultado = await new AxeBuilder({ page }).analyze();
    expect(
      resultado.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
    ).toEqual([]);
  });

  test("se completa y se envía solo con teclado", async ({ page }) => {
    await page.goto("/trabajos/nuevo");
    await page.getByLabel("Título").focus();
    await page.keyboard.type("Pintar el living");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Necesito pintar un living de 4 por 5 metros, paredes y techo.");
    await expect(page.getByLabel("Contá qué pasa")).toBeFocused();
    await page.getByRole("button", { name: "Publicar trabajo" }).focus();
    await expect(page.getByRole("button", { name: "Publicar trabajo" })).toBeFocused();
    await page.keyboard.press("Enter");
    // Sin oficio elegido el formulario no se publica y muestra un error visible.
    await expect(page.getByRole("alert").or(page.getByText(/oficio/i)).first()).toBeVisible();
  });
});

test.describe("un profesional no publica trabajos", () => {
  test.use({ baseURL: URL_PROFESIONAL });

  test("/trabajos/nuevo lo devuelve a su lista", async ({ page }) => {
    await page.goto("/trabajos/nuevo");
    await expect(page).toHaveURL(/\/trabajos$/);
  });
});
