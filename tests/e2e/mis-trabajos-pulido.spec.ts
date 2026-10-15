import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// LAB-48: pulido de Mis trabajos del cliente. Grilla en escritorio, pestañas como links con
// aria-current, hoja de elegir accesible (foco atrapado, Esc, foco que vuelve), error de elegir
// dentro de la hoja, selección inicial en escritorio sin bucle de historial, y celular sin detalle.
//
// Necesita el Supabase falso (LABIA_E2E_SUPABASE_FALSO=1) y se corre con --workers=1.
// Las pruebas que cambian el trabajo 881 lo dejan como estaba (cambiar_profesional al final).
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const PUERTO_FALSO = process.env.LABIA_SUPABASE_FALSO_PUERTO ?? "54399";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

const TRABAJO_ABIERTO = "88888888-8888-4888-8888-888888888881";
const POSTULACION_DIEGO = "99999999-9999-4999-9999-999999999993";
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

const CARPETA_CAPTURAS = process.env.LABIA_CAPTURAS_DIR ?? "";

async function iniciarSesion(contexto: BrowserContext, token: string) {
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
      url: "http://localhost:3000",
    },
  ]);
}

/** Visible para el usuario: el DOM tiene la lista dos veces (celular y escritorio). */
function visible(page: Page, texto: string | RegExp) {
  return page.getByText(texto).filter({ visible: true }).first();
}

/** Foco visible según el token: contorno sólido de 3 px (guía §5). */
async function contornoDeFoco(elemento: import("@playwright/test").Locator) {
  return elemento.evaluate((el) => {
    const estilo = getComputedStyle(el);
    return { estilo: estilo.outlineStyle, ancho: parseFloat(estilo.outlineWidth) };
  });
}

async function capturar(page: Page, testInfo: TestInfo, nombre: string) {
  if (!CARPETA_CAPTURAS) return;
  const carpeta = join(CARPETA_CAPTURAS, testInfo.project.name);
  mkdirSync(carpeta, { recursive: true });
  await page.screenshot({ path: join(carpeta, `${nombre}.png`), fullPage: true });
}

/** Cambia el estado del trabajo 881 en el falso (solo para preparar y restaurar las pruebas). */
async function falso(
  contexto: BrowserContext,
  ruta: string,
  cuerpo: Record<string, string>,
): Promise<void> {
  const respuesta = await contexto.request.post(
    `http://localhost:${PUERTO_FALSO}/rest/v1/rpc/${ruta}`,
    {
      data: cuerpo,
      headers: {
        apikey: "falso",
        Authorization: "Bearer falso",
        "Content-Type": "application/json",
      },
    },
  );
  expect(respuesta.ok(), `falso ${ruta}`).toBeTruthy();
}

for (const esquema of ["light", "dark"] as const) {
  test.describe(`Mis trabajos pulido (${esquema === "light" ? "claro" : "oscuro"})`, () => {
    test.use({ colorScheme: esquema });

    test("pestañas: links con aria-current y foco visible por teclado", async ({
      page,
      context,
    }) => {
      await iniciarSesion(context, "tok-cliente");
      await page.goto("/mis-trabajos?tab=abiertos");

      const filtro = page.getByRole("navigation", { name: "Filtro de mis trabajos" });
      const abiertos = filtro.getByRole("link", { name: "Abiertos" });
      const contratados = filtro.getByRole("link", { name: "Contratados" });

      await expect(abiertos).toHaveAttribute("aria-current", "page");
      await expect(contratados).not.toHaveAttribute("aria-current");
      await expect(page.getByRole("tablist")).toHaveCount(0);

      await abiertos.focus();
      await page.keyboard.press("Tab");
      await expect(contratados).toBeFocused();
      const foco = await contornoDeFoco(contratados);
      expect(foco.estilo).toBe("solid");
      expect(foco.ancho).toBeGreaterThanOrEqual(3);

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/tab=contratados/);
      await expect(filtro.getByRole("link", { name: "Contratados" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    test("axe sin violaciones serias en la lista", async ({ page, context }, testInfo) => {
      await iniciarSesion(context, "tok-cliente");
      await page.goto("/mis-trabajos?tab=abiertos");
      await expect(page.getByRole("heading", { level: 1, name: "Mis trabajos" })).toBeVisible();
      // En escritorio, la selección inicial reemplaza la URL con el id: se espera ese estado antes de auditar.
      if (testInfo.project.name === "escritorio") {
        await expect(page).toHaveURL(/tab=abiertos&id=/);
      }
      await capturar(page, testInfo, `lista-${esquema}`);

      const resultado = await new AxeBuilder({ page }).analyze();
      const graves = resultado.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s)`)).toEqual([]);
    });

    test("elegir: la hoja atrapa el foco, Esc la cierra y el foco vuelve al botón", async ({
      page,
      context,
    }, testInfo) => {
      await iniciarSesion(context, "tok-cliente");
      // En celular el detalle está en su propia página; en escritorio, a la derecha de la lista.
      if (testInfo.project.name === "celular") {
        await page.goto(`/mis-trabajos/${TRABAJO_ABIERTO}`);
      } else {
        await page.goto(`/mis-trabajos?tab=abiertos&id=${TRABAJO_ABIERTO}`);
      }

      const tarjeta = page.getByRole("article", { name: "Postulación de Martín G." }).filter({
        visible: true,
      });
      const botonElegir = tarjeta.getByRole("button", { name: "Elegir" });
      await botonElegir.focus();
      await page.keyboard.press("Enter");

      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      await expect(page.getByText("¿Elegís a Martín?")).toBeVisible();

      // El foco entra a la hoja y no sale con Tab.
      const dentroDelDialogo = () =>
        page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
      expect(await dentroDelDialogo()).toBe(true);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        expect(await dentroDelDialogo(), `Tab ${i + 1} salió de la hoja`).toBe(true);
      }

      // Esc cierra sin elegir y devuelve el foco al botón que la abrió.
      await page.keyboard.press("Escape");
      await expect(dialogo).toBeHidden();
      await expect(botonElegir).toBeFocused();
      // Sin confirmar, el trabajo sigue abierto.
      await expect(visible(page, "Abierto")).toBeVisible();
    });

    test("escritorio: sin ?id= se elige el primer trabajo y el botón atrás no vuelve a la lista", async ({
      page,
      context,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "escritorio",
        "La selección inicial es solo de escritorio",
      );
      await iniciarSesion(context, "tok-cliente");

      // /inicio redirige a /buscar: esa es la página anterior en el historial.
      await page.goto("/buscar");
      await page.goto("/mis-trabajos?tab=abiertos");

      // La URL gana el id del primer trabajo (router.replace) y el detalle se muestra.
      await expect(page).toHaveURL(/tab=abiertos&id=[0-9a-f-]{36}/);
      const panelDetalle = page.getByRole("region", { name: "Detalle del trabajo seleccionado" });
      await expect(panelDetalle.getByRole("heading", { level: 1 })).toBeVisible();
      await capturar(page, testInfo, `escritorio-seleccion-${esquema}`);

      // Como fue un replace, atrás lleva a la página anterior y no se queda en un bucle.
      await page.goBack();
      await expect(page).toHaveURL(/\/buscar/);
      await expect(page).not.toHaveURL(/mis-trabajos/);
    });

    test("celular: la lista sin ?id= no agrega id a la URL ni muestra el detalle", async ({
      page,
      context,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "celular", "En celular no hay panel de detalle");
      await iniciarSesion(context, "tok-cliente");
      await page.goto("/mis-trabajos?tab=abiertos");
      await expect(page.getByRole("heading", { level: 1, name: "Mis trabajos" })).toBeVisible();
      await expect(page).toHaveURL(/\/mis-trabajos\?tab=abiertos$/);
      await expect(
        page.getByRole("region", { name: "Detalle del trabajo seleccionado" }),
      ).toBeHidden();
    });

    test("escritorio: un id que no existe vuelve al primer trabajo", async ({
      page,
      context,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "escritorio",
        "La selección inicial es solo de escritorio",
      );
      await iniciarSesion(context, "tok-cliente");
      await page.goto(`/mis-trabajos?tab=abiertos&id=${ID_INEXISTENTE}`);

      await expect(page).toHaveURL(/tab=abiertos&id=(?!00000000)[0-9a-f-]{36}/);
      await expect(
        page
          .getByRole("region", { name: "Detalle del trabajo seleccionado" })
          .getByRole("heading", { level: 1 }),
      ).toBeVisible();
    });

    test("axe sin violaciones serias en el detalle con la hoja de elegir abierta", async ({
      page,
      context,
    }, testInfo) => {
      await iniciarSesion(context, "tok-cliente");
      if (testInfo.project.name === "celular") {
        await page.goto(`/mis-trabajos/${TRABAJO_ABIERTO}`);
      } else {
        await page.goto(`/mis-trabajos?tab=abiertos&id=${TRABAJO_ABIERTO}`);
      }
      await expect(
        page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }).filter({
          visible: true,
        }),
      ).toBeVisible();

      const tarjeta = page.getByRole("article", { name: "Postulación de Martín G." }).filter({
        visible: true,
      });
      await tarjeta.getByRole("button", { name: "Elegir" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await capturar(page, testInfo, `hoja-elegir-${esquema}`);

      const resultado = await new AxeBuilder({ page }).analyze();
      const graves = resultado.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s)`)).toEqual([]);
      await page.keyboard.press("Escape");
    });
  });
}

// Estas pruebas cambian el estado del trabajo 881 en el falso y lo restauran al final.
test.describe("Elegir con error (LAB-48)", () => {
  test("si el trabajo ya no está abierto, el error aparece dentro de la hoja y la hoja queda abierta", async ({
    page,
    context,
  }, testInfo) => {
    await iniciarSesion(context, "tok-cliente");
    if (testInfo.project.name === "celular") {
      await page.goto(`/mis-trabajos/${TRABAJO_ABIERTO}`);
    } else {
      await page.goto(`/mis-trabajos?tab=abiertos&id=${TRABAJO_ABIERTO}`);
    }
    await expect(
      page.getByRole("article", { name: "Postulación de Martín G." }).filter({ visible: true }),
    ).toBeVisible();

    // Otro dispositivo elige a Diego: la página sigue mostrando "Abierto" (estado viejo).
    await falso(context, "elegir_postulante", { p_postulacion_id: POSTULACION_DIEGO });
    try {
      const tarjeta = page.getByRole("article", { name: "Postulación de Martín G." }).filter({
        visible: true,
      });
      await tarjeta.getByRole("button", { name: "Elegir" }).click();
      await page.getByRole("button", { name: "Elegir profesional" }).click();

      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      const error = dialogo.getByRole("alert");
      await expect(error).toContainText("No podés elegir a este postulante");

      // Esc cierra y el error no queda para la próxima vez.
      await page.keyboard.press("Escape");
      await expect(dialogo).toBeHidden();
      // (El anunciador de rutas de Next también es role=alert, vacío: se mira solo el texto del error.)
      await expect(page.getByRole("alert").filter({ hasText: "No podés elegir" })).toHaveCount(0);
    } finally {
      // Restaura el trabajo 881 abierto para las pruebas que siguen.
      await falso(context, "cambiar_profesional", { p_trabajo_id: TRABAJO_ABIERTO });
    }
  });
});
