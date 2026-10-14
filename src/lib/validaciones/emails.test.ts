import { describe, expect, it } from "vitest";

import { preferenciasDeFormulario } from "./emails";

describe("preferenciasDeFormulario", () => {
  it("un interruptor marcado es true y uno ausente es false", () => {
    const datos = new FormData();
    datos.set("novedades", "on");
    expect(preferenciasDeFormulario(datos)).toEqual({ trabajos_cerca: false, novedades: true });
  });

  it("ignora cualquier valor que no sea 'on'", () => {
    const datos = new FormData();
    datos.set("trabajos_cerca", "true");
    datos.set("novedades", "on");
    expect(preferenciasDeFormulario(datos)).toEqual({ trabajos_cerca: false, novedades: true });
  });
});
