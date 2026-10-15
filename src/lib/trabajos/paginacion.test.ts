import { describe, expect, it } from "vitest";

import {
  MAX_PAGINAS_TRABAJOS,
  TRABAJOS_POR_PAGINA,
  alcanzoElTopeDePaginas,
  hayMasTrabajos,
  leerPaginaTrabajos,
  limiteParaPagina,
  urlTrabajosConPagina,
} from "./paginacion";

describe("leerPaginaTrabajos", () => {
  it("usa la página 1 si no hay parámetro o es inválido", () => {
    expect(leerPaginaTrabajos(undefined)).toBe(1);
    expect(leerPaginaTrabajos("")).toBe(1);
    expect(leerPaginaTrabajos("abc")).toBe(1);
    expect(leerPaginaTrabajos("0")).toBe(1);
    expect(leerPaginaTrabajos("-3")).toBe(1);
  });

  it("lee el número de página", () => {
    expect(leerPaginaTrabajos("2")).toBe(2);
    expect(leerPaginaTrabajos("4")).toBe(4);
  });

  it("topea en MAX_PAGINAS_TRABAJOS", () => {
    expect(leerPaginaTrabajos("99")).toBe(MAX_PAGINAS_TRABAJOS);
  });
});

describe("limiteParaPagina", () => {
  it("trae las páginas 1..N juntas", () => {
    expect(limiteParaPagina(1)).toBe(TRABAJOS_POR_PAGINA);
    expect(limiteParaPagina(3)).toBe(3 * TRABAJOS_POR_PAGINA);
  });
});

describe("hayMasTrabajos y tope de páginas", () => {
  it("ofrece 'Ver más' mientras queden trabajos sin mostrar", () => {
    expect(hayMasTrabajos(20, 35, 1)).toBe(true);
    expect(hayMasTrabajos(35, 35, 2)).toBe(false);
  });

  it("no ofrece 'Ver más' si ya no hay trabajos", () => {
    expect(hayMasTrabajos(0, 0, 1)).toBe(false);
  });

  it("al llegar al tope de páginas indica que hay que refinar los filtros", () => {
    expect(hayMasTrabajos(100, 140, MAX_PAGINAS_TRABAJOS)).toBe(false);
    expect(alcanzoElTopeDePaginas(100, 140, MAX_PAGINAS_TRABAJOS)).toBe(true);
    expect(alcanzoElTopeDePaginas(20, 35, 1)).toBe(false);
  });
});

describe("urlTrabajosConPagina", () => {
  it("conserva los filtros activos y agrega la página", () => {
    expect(urlTrabajosConPagina({ oficio: "gas", zonas: "todas", trabajo: "t1" }, 2)).toBe(
      "/trabajos?oficio=gas&zonas=todas&trabajo=t1&pagina=2",
    );
  });

  it("no pone pagina=1 y sin filtros devuelve la lista limpia", () => {
    expect(urlTrabajosConPagina({}, 1)).toBe("/trabajos");
  });
});
