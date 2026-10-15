import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// LAB-31: reseñas de clientes a profesionales, con el Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
// Cubre: elegibilidad (contactó o eligió), alta desde el perfil, edición dentro de las 24 h, reseña
// vencida, errores de la Server Action junto a la hoja, teclado (foco en la hoja, Esc, foco que vuelve
// al botón), apertura con #resena, autor null ("Cliente de LabÍA") y axe.
// Para correr: ver perfil-datos.spec.ts (mismo servidor falso y mismos puertos). Como el falso guarda las
// reseñas en memoria, reiniciarlo antes de cada corrida.
// Sin LABIA_E2E_SUPABASE_FALSO=1 se saltean: no pueden correr contra el Supabase real del CI.

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const RUTA_PERFIL = `/profesionales/${ID_PUBLICADO}`;
const ID_TRABAJO_TERMINADO = "88888888-8888-4888-8888-888888888891";
const TITULO_HOJA_NUEVA = /¿Cómo te fue con /;
const TITULO_HOJA_EDICION = /Editar reseña de /;
const MENSAJE_CONTACTO =
  "No incluyas números de teléfono ni correos electrónicos en el comentario.";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

// Las altas y ediciones quedan en memoria del falso: se vuelven al estado inicial antes de cada prueba.
// Por eso el spec corre con un solo worker (`--workers=1`).
test.beforeEach(async () => {
  const puerto = process.env.LABIA_SUPABASE_FALSO_PUERTO ?? "54399";
  const respuesta = await fetch(`http://localhost:${puerto}/__reiniciar`);
  expect(respuesta.ok).toBe(true);
});

type Token = "tok-resena-nueva" | "tok-resena-editable" | "tok-resena-vencida" | "tok-resena-ajena";

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

const botonDejarResena = (page: Page) =>
  page.getByRole("button", { name: "Dejar reseña", exact: true });
const botonEditarResena = (page: Page) =>
  page.getByRole("button", { name: "Editar mi reseña", exact: true });
const hoja = (page: Page) => page.getByRole("dialog");

test.describe("reseñas: elegibilidad", () => {
  test("sin cuenta no se ofrece reseñar, pero las reseñas se ven y el autor null dice Cliente de LabÍA", async ({
    page,
  }) => {
    await page.goto(RUTA_PERFIL);
    await expect(page.getByRole("heading", { level: 2, name: "Reseñas" })).toBeVisible();
    await expect(botonDejarResena(page)).toHaveCount(0);
    await expect(botonEditarResena(page)).toHaveCount(0);
    await expect(page.getByText("Cliente de LabÍA").first()).toBeVisible();
  });

  test("un cliente que no contactó ni contrató al profesional no ve el botón", async ({
    context,
    baseURL,
    page,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-resena-ajena");
    await page.goto(RUTA_PERFIL);
    await expect(page.getByRole("heading", { level: 2, name: "Reseñas" })).toBeVisible();
    await expect(botonDejarResena(page)).toHaveCount(0);
    await expect(botonEditarResena(page)).toHaveCount(0);
  });

  test("una reseña vencida (más de 24 h) no se puede editar desde el perfil", async ({
    context,
    baseURL,
    page,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-resena-vencida");
    await page.goto(RUTA_PERFIL);
    await expect(page.getByRole("heading", { level: 2, name: "Reseñas" })).toBeVisible();
    await expect(botonEditarResena(page)).toHaveCount(0);
    await expect(botonDejarResena(page)).toHaveCount(0);
  });
});

test.describe("reseñas: desde mis trabajos", () => {
  test("un trabajo terminado ofrece dejar la reseña y la hoja se publica desde ahí", async ({
    context,
    baseURL,
    page,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-resena-nueva");
    await page.goto(`/mis-trabajos/${ID_TRABAJO_TERMINADO}`);
    await expect(page.getByText("Este trabajo fue completado.")).toBeVisible();
    await page.getByRole("link", { name: "Dejar reseña al profesional" }).click();

    await expect(hoja(page)).toBeVisible();
    await expect(hoja(page).getByRole("heading", { name: TITULO_HOJA_NUEVA })).toBeVisible();
    await hoja(page).getByRole("radio", { name: "Bien", exact: true }).click();
    await hoja(page).getByRole("button", { name: "Publicar reseña" }).click();
    await expect(hoja(page)).toBeHidden();
  });
});

test.describe("reseñas: cliente elegible", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-resena-nueva");
  });

  test("publica una reseña desde el perfil y aparece en la lista pública", async ({ page }) => {
    await page.goto(RUTA_PERFIL);
    await expect(botonDejarResena(page)).toBeVisible();
    await botonDejarResena(page).click();

    await expect(hoja(page)).toBeVisible();
    await expect(hoja(page).getByRole("heading", { name: TITULO_HOJA_NUEVA })).toBeVisible();
    const publicar = hoja(page).getByRole("button", { name: "Publicar reseña" });
    await expect(publicar).toBeDisabled();

    await hoja(page).getByRole("radio", { name: "Excelente" }).click();
    await expect(hoja(page).getByText("Excelente", { exact: true })).toBeVisible();
    await hoja(page).getByRole("button", { name: "Puntual" }).click();
    await hoja(page)
      .getByLabel("Comentario (opcional)")
      .fill("Llegó a horario y dejó todo prolijo.");
    await expect(publicar).toBeEnabled();
    await capturar(page, "resena-hoja", "claro");

    await publicar.click();
    await expect(hoja(page)).toBeHidden();
    await expect(page.getByText("Llegó a horario y dejó todo prolijo.")).toBeVisible();
  });

  test("con teclado: foco dentro de la hoja, Escape la cierra y el foco vuelve al botón", async ({
    page,
  }) => {
    await page.goto(RUTA_PERFIL);
    await expect(botonDejarResena(page)).toBeVisible();
    await botonDejarResena(page).focus();
    await page.keyboard.press("Enter");

    await expect(hoja(page)).toBeVisible();
    const focoDentro = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    );
    expect(focoDentro).toBe(true);

    await page.keyboard.press("Escape");
    await expect(hoja(page)).toBeHidden();
    await expect(botonDejarResena(page)).toBeFocused();
  });

  test("las estrellas se eligen con teclado (radiogroup)", async ({ page }) => {
    await page.goto(RUTA_PERFIL);
    await botonDejarResena(page).click();
    const grupo = hoja(page).getByRole("radiogroup", { name: "Calificación del profesional" });
    await expect(grupo).toBeVisible();
    await grupo.getByRole("radio", { name: "Muy mal", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(hoja(page).getByRole("radio", { name: "Muy mal", exact: true })).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(hoja(page).getByRole("radio", { name: "Mal", exact: true })).toBeChecked();
    await page.keyboard.press("End");
    await expect(hoja(page).getByRole("radio", { name: "Excelente" })).toBeChecked();
  });

  test("un comentario con teléfono se rechaza: el error aparece en la hoja y no se publica", async ({
    page,
  }) => {
    await page.goto(RUTA_PERFIL);
    await botonDejarResena(page).click();
    await hoja(page).getByRole("radio", { name: "Bien" }).click();
    await hoja(page)
      .getByLabel("Comentario (opcional)")
      .fill("Llamame al 2235551234 para coordinar.");
    await hoja(page).getByRole("button", { name: "Publicar reseña" }).click();

    await expect(hoja(page).getByRole("alert")).toHaveText(MENSAJE_CONTACTO);
    await expect(hoja(page)).toBeVisible();
    await capturar(page, "resena-error-contacto", "claro");
  });

  test("abre la hoja sola cuando la URL trae #resena", async ({ page }) => {
    await page.goto(`${RUTA_PERFIL}#resena`);
    await expect(hoja(page)).toBeVisible();
    await expect(hoja(page).getByRole("heading", { name: TITULO_HOJA_NUEVA })).toBeVisible();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`la hoja de reseña no tiene violaciones de accesibilidad (${esquema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto(RUTA_PERFIL);
      await botonDejarResena(page).click();
      await expect(hoja(page)).toBeVisible();
      const resultado = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const graves = resultado.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(graves).toEqual([]);
    });
  }
});

test.describe("reseñas: edición dentro de las 24 horas", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-resena-editable");
  });

  test("el botón dice Editar, la hoja trae la reseña y el cambio se ve en la lista", async ({
    page,
  }) => {
    await page.goto(RUTA_PERFIL);
    await expect(botonEditarResena(page)).toBeVisible();
    await expect(botonDejarResena(page)).toHaveCount(0);
    await botonEditarResena(page).click();

    await expect(hoja(page).getByRole("heading", { name: TITULO_HOJA_EDICION })).toBeVisible();
    await expect(hoja(page).getByLabel("Comentario (opcional)")).toHaveValue(
      "Llegó a horario, el resultado estuvo bien.",
    );
    await hoja(page).getByRole("radio", { name: "Excelente" }).click();
    await hoja(page).getByRole("button", { name: "Guardar cambios" }).click();

    await expect(hoja(page)).toBeHidden();
    await expect(botonEditarResena(page)).toBeVisible();
    await botonEditarResena(page).click();
    await expect(hoja(page).getByRole("radio", { name: "Excelente" })).toBeChecked();
  });
});

test.describe("reseñas: capturas", () => {
  test.skip(!DIR_CAPTURAS, "Solo con LABIA_CAPTURAS_DIR para sacar las capturas");

  for (const esquema of ["claro", "oscuro"] as const) {
    test(`perfil y hojas de reseña (${esquema})`, async ({ context, baseURL, page }) => {
      await page.emulateMedia({ colorScheme: esquema === "claro" ? "light" : "dark" });

      await iniciarSesion(context, baseURL ?? "", "tok-resena-editable");
      await page.goto(RUTA_PERFIL);
      await expect(botonEditarResena(page)).toBeVisible();
      await capturar(page, "resenas-perfil", esquema);
      await botonEditarResena(page).click();
      await expect(hoja(page)).toBeVisible();
      await capturar(page, "resenas-hoja-edicion", esquema);
      await page.keyboard.press("Escape");
      await expect(hoja(page)).toBeHidden();

      await context.clearCookies();
      await iniciarSesion(context, baseURL ?? "", "tok-resena-nueva");
      await page.goto(RUTA_PERFIL);
      await botonDejarResena(page).click();
      await expect(hoja(page)).toBeVisible();
      await hoja(page).getByRole("radio", { name: "Excelente" }).click();
      await capturar(page, "resenas-hoja-nueva", esquema);

      const sinScrollLateral = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
      expect(sinScrollLateral).toBe(true);
    });
  }
});
