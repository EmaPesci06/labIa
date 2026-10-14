import { describe, expect, it } from "vitest";

import { esquemaBorrarCuenta, esquemaCambiarEmail, esquemaContrasenaActual } from "./cuenta";

describe("esquemas de cuenta", () => {
  it("el cambio de email pide la contraseña actual", () => {
    expect(esquemaCambiarEmail.safeParse({ email: "a@b.com", actual: "" }).success).toBe(false);
    expect(esquemaCambiarEmail.safeParse({ email: "a@b.com", actual: "secreta123" }).success).toBe(
      true,
    );
  });
  it("la contraseña actual es obligatoria", () => {
    expect(esquemaContrasenaActual.safeParse({ actual: "" }).success).toBe(false);
  });
  it("borrar exige BORRAR en mayúsculas", () => {
    expect(esquemaBorrarCuenta.safeParse({ confirmacion: "borrar" }).success).toBe(false);
    expect(esquemaBorrarCuenta.safeParse({ confirmacion: " BORRAR " }).success).toBe(true);
  });
});
