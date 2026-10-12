import { describe, expect, it } from "vitest";

import { esDestinoActivo, navegacionPara, type Destino } from "./navegacion";

describe("navegacionPara", () => {
  it("cliente: Inicio, Mis trabajos y Mi cuenta en celular", () => {
    const { celular, accion } = navegacionPara("cliente", "x");
    expect(celular.map((d) => [d.etiqueta, d.href])).toEqual([
      ["Inicio", "/inicio"],
      ["Mis trabajos", "/mis-trabajos"],
      ["Mi cuenta", "/cuenta"],
    ]);
    expect(accion).toEqual({ etiqueta: "Publicar trabajo", href: "/trabajos/nuevo" });
  });

  it("cliente: tres links en escritorio", () => {
    expect(navegacionPara("cliente", "x").escritorio.map((d) => d.etiqueta)).toEqual([
      "Buscar profesionales",
      "Publicar un trabajo",
      "Mis trabajos",
    ]);
  });

  it("profesional: Trabajos, Postulaciones y Mi perfil con su id", () => {
    const { celular, escritorio, accion } = navegacionPara("profesional", "abc");
    expect(celular.map((d) => [d.etiqueta, d.href])).toEqual([
      ["Trabajos", "/trabajos"],
      ["Postulaciones", "/trabajos?vista=mias"],
      ["Mi perfil", "/profesionales/abc"],
    ]);
    expect(escritorio).toEqual(celular);
    expect(accion).toEqual({ etiqueta: "Ver trabajos", href: "/trabajos" });
  });
});

function destino(destinos: readonly Destino[], etiqueta: string): Destino {
  const encontrado = destinos.find((d) => d.etiqueta === etiqueta);
  if (!encontrado) throw new Error(`No hay destino ${etiqueta}`);
  return encontrado;
}

describe("esDestinoActivo", () => {
  const cliente = navegacionPara("cliente", "x").celular;
  const profesional = navegacionPara("profesional", "abc").celular;
  const inicio = destino(cliente, "Inicio");
  const misTrabajos = destino(cliente, "Mis trabajos");
  const cuenta = destino(cliente, "Mi cuenta");

  it("coincide con la ruta exacta y con sub-rutas", () => {
    expect(esDestinoActivo(misTrabajos, "/mis-trabajos", null)).toBe(true);
    expect(esDestinoActivo(misTrabajos, "/trabajos/nuevo", null)).toBe(true);
    expect(esDestinoActivo(cuenta, "/cuenta", null)).toBe(true);
  });

  it("Inicio también está activo en la búsqueda y en un perfil", () => {
    expect(esDestinoActivo(inicio, "/buscar", null)).toBe(true);
    expect(esDestinoActivo(inicio, "/profesionales/7", null)).toBe(true);
  });

  it("no confunde prefijos que solo se parecen", () => {
    expect(esDestinoActivo(cuenta, "/cuenta-vieja", null)).toBe(false);
    expect(esDestinoActivo(inicio, "/mis-trabajos", null)).toBe(false);
  });

  it("Trabajos y Postulaciones se distinguen por ?vista=mias", () => {
    const trabajos = destino(profesional, "Trabajos");
    const postulaciones = destino(profesional, "Postulaciones");
    expect(esDestinoActivo(trabajos, "/trabajos", null)).toBe(true);
    expect(esDestinoActivo(postulaciones, "/trabajos", null)).toBe(false);
    expect(esDestinoActivo(trabajos, "/trabajos", "mias")).toBe(false);
    expect(esDestinoActivo(postulaciones, "/trabajos", "mias")).toBe(true);
  });

  it("Mi perfil solo es el del propio profesional", () => {
    const perfil = destino(profesional, "Mi perfil");
    expect(esDestinoActivo(perfil, "/profesionales/abc", null)).toBe(true);
    expect(esDestinoActivo(perfil, "/profesionales/otro", null)).toBe(false);
  });
});
