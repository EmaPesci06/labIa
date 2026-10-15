import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";
import { reiniciarFalso } from "./apoyo/reiniciar-falso";

// LAB-29: flujo completo de Mis Trabajos del cliente:
// ver postulantes, comparar, elegir a uno atómicamente, flujo de WhatsApp con origen 'postulacion',
// cambiar de profesional y marcar como terminado.
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

// Elegir y terminar cambian los trabajos del falso. Su `/__reiniciar` vuelve trabajos, postulaciones y
// reseñas al estado inicial (LAB-50), así que cada prueba que cambia estado lo reinicia antes:
// - marcar como terminado usa el trabajo 882 y corre en celular y en escritorio;
// - el flujo de elegir a un postulante termina en "cambiar de profesional", que deja el trabajo 881
//   abierto, y las pruebas que siguen lo encuentran igual.
// Se corre con `--workers=1`.
const TRABAJO_ABIERTO = "88888888-8888-4888-8888-888888888881";
const TRABAJO_PARA_TERMINAR = "88888888-8888-4888-8888-888888888882";

async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: string) {
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
      url: baseURL,
    },
  ]);
}

test.describe("Mis trabajos del cliente (LAB-29)", () => {
  test("cliente ve la lista de sus trabajos con pestañas", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/mis-trabajos");

    // Título y pestañas
    await expect(page.getByRole("heading", { level: 1, name: "Mis trabajos" })).toBeVisible();
    // El filtro es de links: la pestaña activa lleva aria-current="page" (LAB-48)
    const filtro = page.getByRole("navigation", { name: "Filtro de mis trabajos" });
    await expect(filtro.getByRole("link", { name: "Abiertos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(filtro.getByRole("link", { name: "Contratados" })).toBeVisible();
    await expect(filtro.getByRole("link", { name: "Terminados" })).toBeVisible();

    // Trabajo publicado en la lista
    // La lista está dos veces en el DOM (celular y escritorio): se mira solo la visible.
    await expect(page.getByText("Olor a gas en la cocina").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Gas · La Perla").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Abierto").filter({ visible: true }).first()).toBeVisible();
  });

  test("flujo completo: ver postulantes, elegir uno, WhatsApp, cambiar profesional y marcar terminado", async ({
    page,
    context,
  }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto(`/mis-trabajos/${TRABAJO_ABIERTO}`);

    // Encabezado del trabajo
    await expect(
      page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
    ).toBeVisible();
    await expect(page.getByText("Gas · La Perla")).toBeVisible();
    await expect(page.getByText("Abierto")).toBeVisible();

    // Postulantes presentes
    await expect(page.getByText("Martín G.")).toBeVisible();
    // Intl es-AR separa el signo con un espacio no separable: \s lo cubre.
    await expect(page.getByText(/Presupuesto estimado\s\$\s40\.000/)).toBeVisible();
    await expect(page.getByText(/Seña\s\$\s10\.000/)).toBeVisible();

    // 1. Elegir a Martín (en "Más recientes" aparece primero Diego: el botón se busca por su tarjeta)
    const botonElegir = page
      .getByRole("article", { name: "Postulación de Martín G." })
      .getByRole("button", { name: "Elegir" });
    await botonElegir.click();

    // Diálogo de confirmación accesible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("¿Elegís a Martín?")).toBeVisible();

    // Confirmar elección
    await page.getByRole("button", { name: "Elegir profesional" }).click();

    // 2. Estado contratado
    await expect(page.getByText(/Elegiste a Martín G\./)).toBeVisible();
    await expect(page.getByText("Elegido")).toBeVisible();
    await expect(page.getByText("Descartado")).toBeVisible();

    // 3. Botón de WhatsApp abre la hoja de consejos
    const botonWhatsApp = page.getByRole("button", { name: "Escribir por WhatsApp" });
    await expect(botonWhatsApp).toBeVisible();
    await botonWhatsApp.click();

    // Hoja "Antes de contactar"
    await expect(page.getByText("Antes de contactar")).toBeVisible();
    await expect(page.getByText("Pedí el presupuesto por escrito.")).toBeVisible();
    // Cerrar la hoja
    await page.keyboard.press("Escape");

    // 4. Cambiar de profesional
    const botonCambiar = page.getByRole("button", { name: "Cambiar de profesional" });
    await expect(botonCambiar).toBeVisible();
    await botonCambiar.click();

    await expect(page.getByText("¿Querés cambiar de profesional?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, cambiar de profesional" }).click();

    // Vuelve a estar abierto y se puede elegir nuevamente
    await expect(page.getByText("Abierto")).toBeVisible();
    await expect(botonElegir).toBeVisible();
  });

  test("marcar como terminado y dejar reseña", async ({ page, context }) => {
    // Terminar cierra el trabajo 882 en el falso: se reinicia antes para que corra en ambos proyectos.
    await reiniciarFalso();
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto(`/mis-trabajos/${TRABAJO_PARA_TERMINAR}`);

    // Elegir al único postulante y marcar como terminado
    await page.getByRole("button", { name: "Elegir" }).click();
    await page.getByRole("button", { name: "Elegir profesional" }).click();
    await expect(page.getByText(/Elegiste a /)).toBeVisible();

    const botonTerminar = page.getByRole("button", { name: "Marcar como terminado" });
    await expect(botonTerminar).toBeVisible();
    await botonTerminar.click();

    await expect(page.getByText("¿El trabajo ya está terminado?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, marcar como terminado" }).click();

    // Estado terminado. Al terminar se abre sola la hoja de reseña (tapa la página).
    await expect(page.getByText("Este trabajo fue completado.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Dejar reseña al profesional" })).toBeVisible();
  });

  test("accesibilidad (axe) en mis trabajos y detalle", async ({ page, context }) => {
    await iniciarSesion(context, "http://localhost:3000", "tok-cliente");
    await page.goto("/mis-trabajos");

    // Esperar el contenido real: mientras carga, la página muestra el fallback "Cargando".
    await expect(page.getByRole("heading", { level: 1, name: "Mis trabajos" })).toBeVisible();
    const axeLista = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(axeLista.violations).toEqual([]);

    await page.goto(`/mis-trabajos/${TRABAJO_ABIERTO}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
    ).toBeVisible();
    const axeDetalle = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(axeDetalle.violations).toEqual([]);
  });
});
