import { describe, expect, it } from "vitest";

import { elegirBarrio, type Barrio } from "./barrios";
import { leerParametrosBusqueda } from "./busqueda";
import { urlBusqueda } from "./busqueda-url";
import { descripcionOficios, esMatriculable, pluralOficio } from "./oficios";

describe("urlBusqueda", () => {
  it("escribe solo lo que no es el valor por defecto", () => {
    expect(urlBusqueda({ barrio: "centro" })).toBe("/buscar?barrio=centro");
    expect(
      urlBusqueda({
        oficio: "gas",
        barrio: "la-perla",
        matriculados: true,
        orden: "calificacion",
        todaLaCiudad: true,
        pagina: 2,
      }),
    ).toBe(
      "/buscar?oficio=gas&barrio=la-perla&matriculados=1&orden=calificacion&toda_la_ciudad=1&pagina=2",
    );
  });

  it("lo que escribe lo entiende el esquema de búsqueda", () => {
    const url = urlBusqueda({ oficio: "gas", barrio: "la-perla", matriculados: true });
    const params = leerParametrosBusqueda(new URL(url, "http://x").searchParams);
    expect(params).toMatchObject({ oficio: "gas", barrio: "la-perla", matriculados: true });
  });
});

describe("elegirBarrio", () => {
  const barrios: Barrio[] = [
    { id: 1, nombre: "Centro", slug: "centro" },
    { id: 2, nombre: "La Perla", slug: "la-perla" },
  ];
  it("prioriza la URL, luego la cuenta, luego el Centro", () => {
    expect(elegirBarrio(barrios, "la-perla", "centro")).toBe("la-perla");
    expect(elegirBarrio(barrios, "no-existe", "la-perla")).toBe("la-perla");
    expect(elegirBarrio(barrios, undefined, undefined)).toBe("centro");
  });
  it("sin lista de barrios usa lo pedido o el Centro", () => {
    expect(elegirBarrio([], "la-perla", undefined)).toBe("la-perla");
    expect(elegirBarrio([], undefined, undefined)).toBe("centro");
  });
});

describe("oficios", () => {
  it("títulos en plural y filtro de matrícula", () => {
    expect(pluralOficio("gas")).toBe("Gasistas");
    expect(pluralOficio(undefined)).toBe("Profesionales");
    expect(esMatriculable("gas")).toBe(true);
    expect(esMatriculable("electricidad")).toBe(true);
    expect(esMatriculable("pintura")).toBe(false);
  });
  it("describe uno o varios oficios", () => {
    expect(descripcionOficios(["gas"])).toBe("Gasista");
    expect(descripcionOficios(["gas", "plomeria"])).toBe("Gas y plomería");
    expect(descripcionOficios(["gas", "plomeria", "pintura"])).toBe("Gas, plomería y pintura");
  });
});
