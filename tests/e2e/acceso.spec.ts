import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LAB-16: bienvenida, ingreso, protección de rutas y sesión.
// El servidor base no tiene sesión falsa: prueba el comportamiento real de visitante.
// Los servidores +100 y +200 simulan un profesional y un cliente (ver playwright.config.ts).
const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;

test.describe("bienvenida", () => {
  test("muestra los dos caminos y el ingreso", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mar del Plata").locator("visible=true").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Qué querés hacer?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Quiero contratar/ })).toHaveAttribute(
      "href",
      "/registro/cliente",
    );
    await expect(page.getByRole("link", { name: /Ofrezco mis servicios/ })).toHaveAttribute(
      "href",
      "/registro/profesional",
    );
    await expect(
      page.getByText(
        "Carpintería · Plomería · Cerrajería · Gas · Pintura · Mecánica · Electricidad",
      ),
    ).toBeVisible();
  });

  test("escritorio en dos columnas, celular en una", async ({ page }) => {
    await page.goto("/");
    const titulo = await page.getByRole("heading", { level: 1 }).boundingBox();
    const tarjeta = await page.getByRole("link", { name: /Quiero contratar/ }).boundingBox();
    const ancho = page.viewportSize()?.width ?? 0;
    if (ancho >= 1024) {
      expect(tarjeta!.x).toBeGreaterThan(titulo!.x + titulo!.width - 1);
    } else {
      expect(tarjeta!.y).toBeGreaterThan(titulo!.y);
      expect(tarjeta!.x).toBeLessThan(ancho / 2);
    }
  });

  test("Quiero contratar lleva al registro de cliente", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Quiero contratar/ }).click();
    await expect(page).toHaveURL(/\/registro\/cliente$/);
    await expect(page.getByRole("heading", { level: 1, name: "Creá tu cuenta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
  });

  test("Ofrezco mis servicios lleva al registro de profesional", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Ofrezco mis servicios/ }).click();
    await expect(page).toHaveURL(/\/registro\/profesional$/);
  });
});

test.describe("ingreso", () => {
  test("muestra Google, email y contraseña, y el link para recuperar", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/restablecer$/);
    // Next conserva la pantalla anterior oculta un momento: solo cuenta el campo visible.
    await expect(page.locator('input[name="email"]:visible')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeVisible();
  });

  test("errores en castellano al lado del campo", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Ingresá tu email.")).toBeVisible();
    await expect(page.getByText("Ingresá tu contraseña.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("el registro valida la contraseña mínima", async ({ page }) => {
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre y apellido").fill("Laura Fernández");
    await page.getByLabel("Email").fill("laura@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("corta");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(
      page.getByText("La contraseña tiene que tener al menos 8 caracteres."),
    ).toBeVisible();
  });

  test("ignora un volver externo", async ({ page }) => {
    await page.goto("/ingresar?volver=https://malo.example");
    await expect(page.locator('input[name="volver"]')).toHaveCount(0);
  });
});

test.describe("rutas protegidas", () => {
  for (const ruta of ["/inicio", "/buscar", "/mis-trabajos", "/cuenta", "/trabajos/nuevo"]) {
    test(`${ruta} sin sesión redirige a /ingresar con volver`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(new RegExp(`/ingresar\\?volver=${encodeURIComponent(ruta)}$`));
      await expect(page.getByRole("heading", { level: 1, name: "Ingresá a LabÍA" })).toBeVisible();
    });
  }

  test("/admin/verificaciones sin sesión responde 404", async ({ page }) => {
    const respuesta = await page.goto("/admin/verificaciones");
    expect(respuesta?.status()).toBe(404);
  });

  test.describe("cliente", () => {
    test.use({ baseURL: URL_CLIENTE });

    test("ve 404 en /admin/verificaciones", async ({ page }) => {
      const respuesta = await page.goto("/admin/verificaciones");
      expect(respuesta?.status()).toBe(404);
    });

    test("en / va a /inicio", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/inicio$/);
    });

    test("en /ingresar va a /inicio", async ({ page }) => {
      await page.goto("/ingresar");
      await expect(page).toHaveURL(/\/inicio$/);
    });

    test("las rutas de profesional lo devuelven a /inicio", async ({ page }) => {
      await page.goto("/trabajos");
      await expect(page).toHaveURL(/\/inicio$/);
    });

    test("tiene la acción Salir", async ({ page }) => {
      await page.goto("/cuenta");
      await expect(page.getByRole("button", { name: "Salir" }).first()).toBeAttached();
    });
  });

  test.describe("profesional", () => {
    test.use({ baseURL: URL_PROFESIONAL });

    test("en / va a /trabajos", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/trabajos$/);
    });

    test("las rutas de cliente lo devuelven a /trabajos", async ({ page }) => {
      await page.goto("/mis-trabajos");
      await expect(page).toHaveURL(/\/trabajos$/);
      await page.goto("/trabajos/nuevo");
      await expect(page).toHaveURL(/\/trabajos$/);
    });

    test("ve 404 en /admin/reportes", async ({ page }) => {
      const respuesta = await page.goto("/admin/reportes");
      expect(respuesta?.status()).toBe(404);
    });
  });
});

// Camino completo contra un Supabase real (proyecto de desarrollo con confirmación de email
// desactivada): E2E_AUTH=1 y las variables de Supabase cargadas al construir.
test.describe("cuenta real", () => {
  test.skip(process.env.E2E_AUTH !== "1", "Necesita Supabase real (E2E_AUTH=1).");

  test("crear cuenta, salir, ingresar y volver a la ruta pedida", async ({ page }) => {
    const email = `e2e+${Date.now()}@example.com`;
    const contrasena = "clave-de-prueba-123";

    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre y apellido").fill("Prueba Uno");
    await page.getByLabel("Celular de WhatsApp").fill("223 555 1234");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("radio", { name: "Centro" }).click();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/inicio$/);

    // Salir: en celular está en /cuenta; en escritorio, en el menú del avatar.
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Salir" }).first().click();
    await expect(page).toHaveURL(/\/$/);

    // Sin sesión, /buscar manda a ingresar y al ingresar vuelve a /buscar.
    await page.goto("/buscar");
    await expect(page).toHaveURL(/\/ingresar\?volver=%2Fbuscar$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("otra-clave-equivocada");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("El email o la contraseña no coinciden.")).toBeVisible();

    await page.getByLabel("Contraseña").fill(contrasena);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/buscar$/);
  });
});

test.describe("accesibilidad", () => {
  for (const ruta of [
    "/",
    "/ingresar",
    "/registro/cliente",
    "/registro/profesional",
    "/restablecer",
  ]) {
    test(`${ruta} sin violaciones de axe`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      const resultado = await new AxeBuilder({ page }).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("modo oscuro", () => {
  test.use({ colorScheme: "dark" });

  for (const ruta of [
    "/",
    "/ingresar",
    "/registro/cliente",
    "/registro/profesional",
    "/restablecer",
  ]) {
    test(`${ruta} sin violaciones de axe en oscuro`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      const resultado = await new AxeBuilder({ page }).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("teclado", () => {
  test("se puede ingresar y recorrer el formulario solo con teclado", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByLabel("Email").focus();
    await page.keyboard.type("laura@example.com");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Contraseña")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Ingresá tu contraseña.")).toBeVisible();
  });

  test("los links de la bienvenida tienen foco visible", async ({ page }) => {
    await page.goto("/");
    const enlace = page.getByRole("link", { name: /Quiero contratar/ });
    await enlace.focus();
    await expect(enlace).toBeFocused();
    const contorno = await enlace.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(contorno).not.toBe("none");
  });
});

test.describe("restablecer", () => {
  test("pide el email y muestra el error en castellano", async ({ page }) => {
    await page.goto("/restablecer");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText("Ingresá tu email.")).toBeVisible();
  });
});
