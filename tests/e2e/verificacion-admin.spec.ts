import { expect, test } from "@playwright/test";

// LAB-21: el panel de verificación es solo para el rol admin. Cualquier otro (o sin sesión) recibe
// un 404, y no se filtra nada del panel. Las sesiones falsas (profesional y cliente) están en el
// config de Playwright; la sesión de admin requiere Supabase real y se prueba en los tests de base
// (supabase/tests/database/panel_verificacion.test.sql) y en las unitarias.

const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);

const RUTAS = [
  "/admin/verificaciones",
  "/admin/verificaciones?pestana=rechazados",
  "/admin/verificaciones/11111111-1111-4111-8111-111111111111",
];

test.describe("panel de verificación: acceso solo para admin", () => {
  test("sin sesión, /admin/* responde 404 y no muestra el panel", async ({ request }) => {
    for (const ruta of RUTAS) {
      const respuesta = await request.get(ruta);
      expect(respuesta.status(), ruta).toBe(404);
      expect(await respuesta.text()).not.toContain("Verificaciones");
    }
  });

  test("un profesional con sesión recibe 404", async ({ request }) => {
    for (const ruta of RUTAS) {
      const respuesta = await request.get(`http://localhost:${PUERTO + 100}${ruta}`);
      expect(respuesta.status(), ruta).toBe(404);
      expect(await respuesta.text()).not.toContain("Panel interno");
    }
  });

  test("un cliente con sesión recibe 404", async ({ request }) => {
    for (const ruta of RUTAS) {
      const respuesta = await request.get(`http://localhost:${PUERTO + 200}${ruta}`);
      expect(respuesta.status(), ruta).toBe(404);
    }
  });
});
