import { expect, test } from "@playwright/test";

// LAB-24: el perfil público se ve sin cuenta. Estas pruebas no dependen de datos: un perfil que no
// existe muestra la pantalla "No encontramos esta página" y no manda a /ingresar. (El código HTTP
// no se prueba: con la página en streaming, Next ya mandó el 200 cuando se llama a notFound().)

for (const id of ["00000000-0000-4000-8000-000000000000", "no-es-un-uuid"]) {
  test(`sin cuenta, /profesionales/${id} muestra "No encontramos esta página"`, async ({
    page,
  }) => {
    await page.goto(`/profesionales/${id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/ingresar/);
    await expect(page).toHaveURL(new RegExp(`/profesionales/${id}$`));
  });
}
