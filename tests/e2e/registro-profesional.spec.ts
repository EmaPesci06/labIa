import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LAB-18: registro de profesional, paso 1 (el perfil).
// Las pruebas de validación y de interfaz no necesitan Supabase; la de punta a punta crea una
// cuenta real en el proyecto de desarrollo (E2E_AUTH=1, confirmación de email desactivada).

const siguiente = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Siguiente: normas de seguridad" }).locator("visible=true");

test.describe("registro de profesional · paso 1", () => {
  test("muestra la cinta de pasos, el título y las secciones", async ({ page }) => {
    await page.goto("/registro/profesional");
    await expect(page.getByRole("group", { name: /Paso 1 de 2/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Contanos qué sabés hacer" }),
    ).toBeVisible();
    await expect(
      page.getByText("Esto es lo que van a ver los clientes en tu perfil."),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Oficios" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Toda la ciudad" })).toBeVisible();
    await expect(page.getByLabel("Contá cómo trabajás")).toBeVisible();
    await expect(
      page
        .getByText("La revisamos a mano. No se muestra en tu perfil: solo aparecen las insignias.")
        .locator("visible=true"),
    ).toBeVisible();
  });

  test("gasista sin matrícula no avanza y aparece la ayuda", async ({ page }) => {
    await page.goto("/registro/profesional");
    await page.getByRole("button", { name: "Plomería" }).click();
    await expect(page.getByText("La matrícula es obligatoria para gasistas.")).toHaveCount(0);

    await page.getByRole("button", { name: "Gas" }).click();
    await expect(page.getByText("La matrícula es obligatoria para gasistas.")).toBeVisible();

    await page.getByLabel("Nombre y apellido").fill("Martín Gómez");
    await page.getByLabel("WhatsApp").fill("223 555-0000");
    await page.getByLabel("Email").fill("martin@example.com");
    await page.getByLabel("Contraseña").fill("clave-de-prueba-123");
    await page.getByRole("button", { name: "Toda la ciudad" }).click();
    await siguiente(page).click();

    await expect(page).toHaveURL(/\/registro\/profesional$/);
    await expect(page.getByText("La matrícula es obligatoria para gasistas.")).toBeVisible();
    await expect(page.getByLabel(/Matrícula/)).toHaveAttribute("aria-invalid", "true");
  });

  test("sin datos muestra los errores en castellano junto a cada campo", async ({ page }) => {
    await page.goto("/registro/profesional");
    await siguiente(page).click();
    await expect(page.getByText("Ingresá tu nombre y apellido.")).toBeVisible();
    await expect(page.getByText("Ingresá tu WhatsApp.")).toBeVisible();
    await expect(page.getByText("Elegí al menos un oficio.")).toBeVisible();
    await expect(
      page.getByText("Elegí dónde trabajás: toda la ciudad o al menos un barrio."),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre y apellido")).toBeFocused();
  });

  test("'Toda la ciudad' desmarca los barrios", async ({ page }) => {
    await page.goto("/registro/profesional");
    const centro = page.getByRole("button", { name: "Centro", exact: true });
    const toda = page.getByRole("button", { name: "Toda la ciudad" });
    await centro.click();
    await expect(centro).toHaveAttribute("aria-pressed", "true");
    await toda.click();
    await expect(toda).toHaveAttribute("aria-pressed", "true");
    await expect(centro).toHaveAttribute("aria-pressed", "false");
    // Elegir un barrio después apaga "Toda la ciudad".
    await centro.click();
    await expect(toda).toHaveAttribute("aria-pressed", "false");
  });

  test("contador de la descripción y vista previa en vivo (escritorio)", async ({ page }) => {
    await page.goto("/registro/profesional");
    await page.getByLabel("Contá cómo trabajás").fill("Hola");
    await expect(page.getByText("4/500")).toBeVisible();

    const vista = page.getByRole("heading", { name: "Así te ven los clientes" });
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.getByLabel("Nombre y apellido").fill("Martín Gómez");
      await page.getByRole("button", { name: "Gas" }).click();
      await page.getByRole("button", { name: "Toda la ciudad" }).click();
      const tarjeta = page.getByRole("region", { name: "Así te ven los clientes" });
      await expect(tarjeta.getByText("Martín Gómez")).toBeVisible();
      await expect(tarjeta.getByText("Gas")).toBeVisible();
      await expect(tarjeta.getByText("Zonas: Toda la ciudad")).toBeVisible();
      await expect(tarjeta.getByText("Identidad verificada · pendiente")).toBeVisible();
    } else {
      await expect(vista).toBeHidden();
    }
  });

  test("el paso 2 existe y muestra la cinta en el paso 2", async ({ page }) => {
    await page.goto("/registro/profesional/normas");
    await expect(page.getByRole("group", { name: /Paso 2 de 2/ })).toBeVisible();
  });
});

// PNG de 1x1 px: alcanza para que el navegador lo decodifique y lo comprima.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
// El botón se habilita cuando React tomó el control del formulario: recién ahí los inputs responden.
const hidratada = async (page: import("@playwright/test").Page) => {
  await page.goto("/registro/profesional");
  await expect(siguiente(page)).toBeEnabled();
};
const foto = (n: number) => ({ name: `trabajo-${n}.png`, mimeType: "image/png", buffer: PNG });

test.describe("registro de profesional · formulario completo", () => {
  test("el contador llega a 500 y no deja escribir más", async ({ page }) => {
    await hidratada(page);
    const area = page.getByLabel("Contá cómo trabajás");
    await area.fill("a".repeat(600));
    await expect(area).toHaveValue("a".repeat(500));
    await expect(page.getByText("500/500")).toBeVisible();
  });

  test("la ayuda de matrícula aparece con Gas y se va al sacar el oficio", async ({ page }) => {
    await hidratada(page);
    const gas = page.getByRole("button", { name: "Gas" });
    await gas.click();
    await expect(page.getByText("La matrícula es obligatoria para gasistas.")).toBeVisible();
    await gas.click();
    await expect(page.getByText("La matrícula es obligatoria para gasistas.")).toHaveCount(0);
  });

  test("fotos de trabajos: cargar, quitar y límite de 10", async ({ page }) => {
    await hidratada(page);
    const entrada = page.locator('input[type="file"][multiple]');
    await expect(page.getByText("0 de 10 fotos")).toBeVisible();

    await entrada.setInputFiles([foto(1), foto(2), foto(3)]);
    await expect(page.getByText("3 de 10 fotos")).toBeVisible();
    await expect(page.getByRole("img", { name: "Foto de trabajo 3" })).toBeVisible();

    await page.getByRole("button", { name: "Quitar foto de trabajo 2" }).click();
    await expect(page.getByText("2 de 10 fotos")).toBeVisible();

    // 12 archivos de golpe: entran solo los que caben y se avisa.
    await entrada.setInputFiles(Array.from({ length: 12 }, (_, i) => foto(i)));
    await expect(page.getByText("10 de 10 fotos")).toBeVisible();
    await expect(page.getByText(/Podés subir hasta 10 fotos/)).toBeVisible();
    await expect(entrada).toBeDisabled();
  });

  test("foto de perfil: cargar y quitar", async ({ page }) => {
    await hidratada(page);
    await page.locator('input[type="file"]:not([multiple])').setInputFiles(foto(1));
    await expect(page.getByRole("img", { name: "Tu foto de perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Quitar foto de perfil" }).click();
    await expect(page.getByRole("img", { name: "Tu foto de perfil" })).toHaveCount(0);
  });

  test("un archivo que no es imagen no suma fotos", async ({ page }) => {
    await hidratada(page);
    await page
      .locator('input[type="file"][multiple]')
      .setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
    await expect(page.getByText("0 de 10 fotos")).toBeVisible();
  });

  test("con teclado: Tab llega a los oficios y Espacio los marca", async ({ page }) => {
    await hidratada(page);
    await page.getByLabel("Nombre y apellido").focus();
    const plomeria = page.getByRole("button", { name: "Plomería" });
    for (let i = 0; i < 25; i++) {
      if (await plomeria.evaluate((e) => e === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(plomeria).toBeFocused();
    await page.keyboard.press("Space");
    await expect(plomeria).toHaveAttribute("aria-pressed", "true");
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`axe sin violaciones con fotos y errores (${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await hidratada(page);
      await page.locator('input[type="file"][multiple]').setInputFiles([foto(1), foto(2)]);
      await expect(page.getByText("2 de 10 fotos")).toBeVisible();
      await page.getByRole("button", { name: "Gas" }).click();
      await siguiente(page).click();
      await expect(page.getByText("Ingresá tu nombre y apellido.")).toBeVisible();
      const resultado = await new AxeBuilder({ page }).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("cuenta real", () => {
  test.skip(process.env.E2E_AUTH !== "1", "Necesita Supabase real (E2E_AUTH=1).");

  test("crear profesional hasta el paso 2 y recuperar lo guardado al recargar", async ({
    page,
  }) => {
    const email = `e2e+pro${Date.now()}@example.com`;
    await page.goto("/registro/profesional");
    await page.getByLabel("Nombre y apellido").fill("Martín Gómez");
    await page.getByLabel("WhatsApp").fill("223 555-0000");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("clave-de-prueba-123");
    await page.getByLabel("Tu barrio").selectOption({ label: "La Perla" });
    await page.getByRole("button", { name: "Plomería" }).click();
    await page.getByRole("button", { name: "Gas" }).click();
    await page.getByLabel(/Matrícula/).fill("MG-1234");
    await page.getByLabel("Especialidades (opcional)").fill("Calefactores");
    await page.getByRole("button", { name: "Centro", exact: true }).click();
    await page.getByLabel("Años de experiencia").fill("12");
    await page.getByLabel("Disponibilidad").fill("Lun a sáb, 8 a 18 h");
    await page.getByLabel("Contá cómo trabajás").fill("Instalaciones y reparaciones.");

    await siguiente(page).click();
    await expect(page).toHaveURL(/\/registro\/profesional\/normas$/);

    await page.goto("/registro/profesional");
    await expect(page.getByLabel("Nombre y apellido")).toHaveValue("Martín Gómez");
    await expect(page.getByLabel(/Matrícula/)).toHaveValue("MG-1234");
    await expect(page.getByLabel("Tu barrio")).toHaveValue(/\d+/);
    await expect(page.getByRole("button", { name: "Gas" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Centro", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("Contá cómo trabajás")).toHaveValue(
      "Instalaciones y reparaciones.",
    );
  });
});
