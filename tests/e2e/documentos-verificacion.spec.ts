import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// LAB-19: carga de documentos (DNI, antecedentes, matrícula) en el registro de profesional.
// La interfaz se prueba sin Supabase; la subida real al bucket privado necesita E2E_AUTH=1.

const PDF = {
  name: "antecedentes.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4"),
};
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const imagen = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });
const TEXTO = { name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") };

const siguiente = (page: Page) =>
  page.getByRole("button", { name: "Siguiente: normas de seguridad" }).locator("visible=true");

// Hay dos bloques en el DOM (celular y escritorio): se usa el que se ve.
const bloque = (page: Page) =>
  page.getByRole("region", { name: "Verificación obligatoria" }).locator("visible=true");

// Los dos bloques repiten los mismos id (doc-antecedentes, doc-matricula): getByLabel apuntaría al
// del bloque oculto en escritorio. Se toma el input que está dentro de la etiqueta del bloque visible.
const entrada = (b: Locator, etiqueta: string) =>
  b.locator("label").filter({ hasText: etiqueta }).locator('input[type="file"]');

// LAB-43: sin la casilla de consentimiento para datos sensibles no se puede subir nada.
const casillaConsentimiento = (b: Locator) =>
  b.getByRole("checkbox", { name: /Acepto que LabÍA trate mi DNI/ });

async function consentir(page: Page) {
  await casillaConsentimiento(bloque(page)).check();
}

async function abrir(page: Page) {
  await page.goto("/registro/profesional");
  await expect(siguiente(page)).toBeEnabled();
  await consentir(page);
}

async function abrirDni(page: Page) {
  await bloque(page)
    .getByRole("button", { name: /DNI, frente y dorso/ })
    .click();
}

test.describe("documentos de verificación", () => {
  test("sin consentimiento, las entradas de archivo están deshabilitadas", async ({ page }) => {
    await page.goto("/registro/profesional");
    await expect(siguiente(page)).toBeEnabled();
    const b = bloque(page);
    await expect(casillaConsentimiento(b)).not.toBeChecked();
    await expect(entrada(b, "Certificado de antecedentes")).toBeDisabled();
    await abrirDni(page);
    await expect(entrada(b, "Frente del DNI")).toBeDisabled();

    await consentir(page);
    await expect(entrada(b, "Certificado de antecedentes")).toBeEnabled();
    await expect(entrada(b, "Frente del DNI")).toBeEnabled();
  });

  test("muestra el bloque con el texto y las filas obligatorias", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await expect(b.getByRole("heading", { name: "Verificación obligatoria" })).toBeVisible();
    await expect(
      b.getByText("La revisamos a mano. No se muestra en tu perfil: solo aparecen las insignias."),
    ).toBeVisible();
    await expect(b.getByRole("button", { name: /DNI, frente y dorso/ })).toBeVisible();
    await expect(b.getByText("Certificado de antecedentes", { exact: true })).toBeVisible();
    await expect(b.getByText("Constancia de matrícula")).toHaveCount(0);
  });

  test("DNI: se despliega, suma frente y dorso y llega a 2/2", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    const boton = b.getByRole("button", { name: /DNI, frente y dorso/ });
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await abrirDni(page);
    await expect(boton).toHaveAttribute("aria-expanded", "true");

    await entrada(b, "Frente del DNI").setInputFiles(imagen("frente.png"));
    await expect(b.getByText("frente.png")).toBeVisible();
    await expect(b.getByText("1/2")).toBeVisible();

    await entrada(b, "Dorso del DNI").setInputFiles(imagen("dorso.png"));
    await expect(b.getByText("2/2")).toBeVisible();
    await expect(b.getByText("Listo")).toBeVisible();

    await b.getByRole("button", { name: "Quitar archivo de Frente del DNI" }).click();
    await expect(b.getByText("1/2")).toBeVisible();
    await expect(b.getByText("frente.png")).toHaveCount(0);
  });

  test("antecedentes: acepta PDF y se puede quitar", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await entrada(b, "Certificado de antecedentes").setInputFiles(PDF);
    await expect(b.getByText("antecedentes.pdf")).toBeVisible();
    await b.getByRole("button", { name: "Quitar archivo de Certificado de antecedentes" }).click();
    await expect(b.getByText("antecedentes.pdf")).toHaveCount(0);
    await expect(b.getByText("Subir PDF")).toBeVisible();
  });

  test("error: un tipo de archivo no permitido avisa y no lo suma", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await entrada(b, "Certificado de antecedentes").setInputFiles(TEXTO);
    await expect(b.getByRole("alert")).toHaveText(
      "Formato no válido. Subí una imagen (JPG, PNG) o un PDF.",
    );
    await expect(b.getByText("nota.txt")).toHaveCount(0);
  });

  test("error: un archivo de más de 8 MB avisa y no lo suma", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await entrada(b, "Certificado de antecedentes").setInputFiles({
      name: "grande.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1, 1),
    });
    await expect(b.getByRole("alert")).toHaveText("El archivo no puede superar los 8 MB.");
    await expect(b.getByText("grande.pdf")).toHaveCount(0);
  });

  test("el error se va al elegir un archivo válido", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    const campo = entrada(b, "Certificado de antecedentes");
    await campo.setInputFiles(TEXTO);
    await expect(b.getByRole("alert")).toBeVisible();
    await campo.setInputFiles(PDF);
    await expect(b.getByRole("alert")).toHaveCount(0);
  });

  test("gasista: aparece la matrícula con Gas, acepta archivo y se va al sacar Gas", async ({
    page,
  }) => {
    await abrir(page);
    const b = bloque(page);
    const gas = page.getByRole("button", { name: "Gas" });
    await gas.click();
    await expect(b.getByText("Constancia de matrícula")).toBeVisible();
    await entrada(b, "Constancia de matrícula").setInputFiles(imagen("carnet.png"));
    await expect(b.getByText("carnet.png")).toBeVisible();
    await gas.click();
    await expect(b.getByText("Constancia de matrícula")).toHaveCount(0);
  });

  test("con teclado: Enter y Espacio despliegan y pliegan el DNI", async ({ page }) => {
    await abrir(page);
    const boton = bloque(page).getByRole("button", { name: /DNI, frente y dorso/ });
    await boton.focus();
    await expect(boton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(boton).toHaveAttribute("aria-expanded", "false");
  });

  // Convención de la app: táctiles de 44 px.
  test("el botón de quitar mide al menos 44 px", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await entrada(b, "Certificado de antecedentes").setInputFiles(PDF);
    const quitar = b.getByRole("button", { name: "Quitar archivo de Certificado de antecedentes" });
    const caja = await quitar.boundingBox();
    expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  // Criterio de aceptación de LAB-19 (lógica 5): sin los documentos obligatorios no se pasa al paso 2.
  test("no se puede avanzar sin DNI y antecedentes", async ({ page }) => {
    await abrir(page);
    await page.getByLabel("Nombre y apellido").fill("Martín Gómez");
    await page.getByLabel("WhatsApp").fill("223 555-0000");
    await page.getByLabel("Email").fill("martin@example.com");
    await page.getByLabel("Contraseña").fill("clave-de-prueba-123");
    await page.getByRole("button", { name: "Plomería" }).click();
    await page.getByRole("button", { name: "Toda la ciudad" }).click();
    await siguiente(page).click();
    await expect(
      bloque(page).getByText(
        "Para publicar tu perfil necesitamos tu DNI y tu certificado de antecedentes.",
      ),
    ).toBeVisible();
  });

  // Criterio: en celular se abre la cámara directamente.
  // El certificado de antecedentes es un PDF: sin `capture` el celular deja elegirlo.
  test("las entradas de fotos piden la cámara en celular", async ({ page }) => {
    await abrir(page);
    await page.getByRole("button", { name: "Gas" }).click();
    const b = bloque(page);
    await abrirDni(page);
    for (const etiqueta of ["Frente del DNI", "Dorso del DNI", "Constancia de matrícula"]) {
      await expect(entrada(b, etiqueta)).toHaveAttribute("capture", "environment");
    }
    await expect(entrada(b, "Certificado de antecedentes")).not.toHaveAttribute("capture");
  });

  test("ids únicos y la etiqueta apunta al input del bloque visible", async ({ page }) => {
    await abrir(page);
    const repetidos = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(repetidos).toEqual([]);
    await expect(entrada(bloque(page), "Certificado de antecedentes")).toBeAttached();
  });

  test("muestra la ayuda con el link del Registro Nacional de Reincidencia", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await expect(b.getByText(/Tiene que tener menos de 90 días/)).toBeVisible();
    await expect(
      b.getByRole("link", { name: "Registro Nacional de Reincidencia" }),
    ).toHaveAttribute(
      "href",
      "https://www.argentina.gob.ar/justicia/reincidencia/antecedentespenales",
    );
    await expect(b.getByText("Falta subir").first()).toBeVisible();
  });

  // LAB-43: a 390 px el estado de la fila ("Falta subir" / "Subir PDF") no se parte en varias líneas.
  test("la fila de antecedentes se lee en una línea de estado", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    const falta = await b.getByText("Falta subir").first().boundingBox();
    const subir = await b.getByText("Subir PDF").first().boundingBox();
    expect(falta?.height ?? 99).toBeLessThan(26);
    expect(subir?.height ?? 99).toBeLessThan(26);
  });

  test("un archivo cuyo contenido no coincide con su extensión se rechaza", async ({ page }) => {
    await abrir(page);
    const b = bloque(page);
    await entrada(b, "Certificado de antecedentes").setInputFiles({
      name: "falso.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("esto no es un pdf"),
    });
    await expect(b.getByRole("alert")).toHaveText(
      "Formato no válido. Subí una imagen (JPG, PNG) o un PDF.",
    );
    await entrada(b, "Certificado de antecedentes").setInputFiles({
      name: "foto.pdf",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(b.getByRole("alert")).toHaveText(
      "Formato no válido. Subí una imagen (JPG, PNG) o un PDF.",
    );
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`axe sin violaciones con DNI desplegado, archivos, gas y error (${esquema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await abrir(page);
      await page.getByRole("button", { name: "Gas" }).click();
      const b = bloque(page);
      await abrirDni(page);
      await entrada(b, "Frente del DNI").setInputFiles(imagen("frente.png"));
      await entrada(b, "Constancia de matrícula").setInputFiles(PDF);
      await entrada(b, "Certificado de antecedentes").setInputFiles(TEXTO);
      await expect(b.getByRole("alert")).toBeVisible();
      const resultado = await new AxeBuilder({ page }).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("/cuenta/verificacion", () => {
  // Servidor con la sesión falsa de profesional (sin Supabase no hay cuenta real: avisa).
  test.use({
    baseURL: `http://localhost:${Number(process.env.PUERTO_E2E ?? 3000) + 100}`,
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`sin cuenta de profesional avisa, ofrece volver y pasa axe (${esquema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto("/cuenta/verificacion");
      await expect(page.getByRole("heading", { level: 1, name: "Verificación" })).toBeVisible();
      await expect(
        page.getByText("La verificación de documentos es para cuentas de profesional."),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Volver a mi cuenta" }).locator("visible=true"),
      ).toBeVisible();
      const resultado = await new AxeBuilder({ page }).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("documentos con cuenta real", () => {
  test.skip(process.env.E2E_AUTH !== "1", "Necesita Supabase real (E2E_AUTH=1).");

  test("sube DNI y antecedentes y quedan en revisión", async ({ page }) => {
    const email = `e2e+doc${Date.now()}@example.com`;
    await page.goto("/registro/profesional");
    await page.getByLabel("Nombre y apellido").fill("Martín Gómez");
    await page.getByLabel("WhatsApp").fill("223 555-0000");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("clave-de-prueba-123");
    await page.getByLabel("Tu barrio").selectOption({ label: "La Perla" });
    await page.getByRole("button", { name: "Plomería" }).click();
    await page.getByRole("button", { name: "Toda la ciudad" }).click();
    const b = bloque(page);
    await consentir(page);
    await abrirDni(page);
    await entrada(b, "Frente del DNI").setInputFiles(imagen("frente.png"));
    await entrada(b, "Dorso del DNI").setInputFiles(imagen("dorso.png"));
    await entrada(b, "Certificado de antecedentes").setInputFiles(PDF);
    await siguiente(page).click();
    await expect(page).toHaveURL(/\/registro\/profesional\/normas$/);

    await page.goto("/registro/profesional");
    await expect(bloque(page).getByText("En revisión").first()).toBeVisible();
  });
});
