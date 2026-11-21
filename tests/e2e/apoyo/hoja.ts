import { expect, type Locator, type Page } from "@playwright/test";

// La hoja (`Hoja`, sobre `Sheet` de shadcn / Base UI) entra con una transición de opacidad y desplazamiento.
// Mientras dura, axe mide colores mezclados con el velo (falsos positivos de contraste) y las capturas salen a
// medias. Estas ayudas esperan al estado de reposo en lugar de dormir un tiempo fijo.

/**
 * Espera a que la hoja abierta termine de animarse: visible, sin `data-starting-style` ni
 * `data-ending-style` y sin animaciones ni transiciones finitas corriendo en la página.
 */
export async function esperarHojaQuieta(page: Page, hoja?: Locator): Promise<void> {
  const dialogo = hoja ?? page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await expect(dialogo).not.toHaveAttribute("data-starting-style", /.*/);
  await expect(dialogo).not.toHaveAttribute("data-ending-style", /.*/);
  await page.waitForFunction(() =>
    document.getAnimations().every((animacion) => {
      const iteraciones = animacion.effect?.getComputedTiming().iterations ?? 1;
      return !Number.isFinite(iteraciones) || animacion.playState === "finished";
    }),
  );
}

/**
 * Indica si el foco está dentro del diálogo. Base UI mueve el foco a una guarda (`span` con `tabindex`)
 * y lo devuelve a la hoja en el cuadro siguiente: se lo espera con `expect.poll` en lugar de leerlo al toque.
 */
export const focoDentroDelDialogo = (page: Page): Promise<boolean> =>
  page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
