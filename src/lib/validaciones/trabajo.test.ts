import { describe, expect, it } from "vitest";

import { erroresDeTrabajo, esquemaFotos, esquemaTrabajo, tieneDatosDeContacto } from "./trabajo";

const valido = {
  oficio: "gas",
  titulo: "Olor a gas en la cocina",
  descripcion: "Desde ayer hay olor a gas cerca del horno. Ya cerré la llave de paso.",
  barrioId: "51",
  urgencia: "lo_antes_posible",
};

describe("tieneDatosDeContacto", () => {
  it("detecta teléfonos con distintos formatos", () => {
    expect(tieneDatosDeContacto("llamame al 223 555-1234")).toBe(true);
    expect(tieneDatosDeContacto("+54 9 223 555 1234")).toBe(true);
    expect(tieneDatosDeContacto("2235551234")).toBe(true);
    expect(tieneDatosDeContacto("(0223) 495-1234")).toBe(true);
  });
  it("detecta emails", () => {
    expect(tieneDatosDeContacto("escribime a laura@correo.com")).toBe(true);
  });
  it("deja pasar números comunes", () => {
    expect(tieneDatosDeContacto("Son 3 canillas y 12 metros de caño")).toBe(false);
    expect(tieneDatosDeContacto("Presupuesto previo: $ 150.000")).toBe(false);
  });
});

describe("esquemaTrabajo", () => {
  it("acepta un trabajo válido", () => {
    expect(esquemaTrabajo.safeParse(valido).success).toBe(true);
  });
  it("valida largos con mensajes en castellano", () => {
    const r = esquemaTrabajo.safeParse({ ...valido, titulo: "Hola", descripcion: "corto" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erroresDeTrabajo(r.error);
      expect(e.titulo).toMatch(/al menos 5/);
      expect(e.descripcion).toMatch(/al menos 20/);
    }
  });
  it("rechaza teléfonos en el texto", () => {
    const r = esquemaTrabajo.safeParse({
      ...valido,
      descripcion: "Llamame al 223 555 1234 que es urgente por favor",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresDeTrabajo(r.error).descripcion).toMatch(/No pongas tu teléfono/);
  });
  it("normaliza el presupuesto", () => {
    expect(esquemaTrabajo.parse({ ...valido, presupuesto: "$ 15.000" }).presupuesto).toBe(15000);
    expect(esquemaTrabajo.parse({ ...valido, presupuesto: "" }).presupuesto).toBeUndefined();
    expect(esquemaTrabajo.safeParse({ ...valido, presupuesto: "mucho" }).success).toBe(false);
  });
  it("rechaza oficio y urgencia inventados", () => {
    expect(esquemaTrabajo.safeParse({ ...valido, oficio: "jardineria" }).success).toBe(false);
    expect(esquemaTrabajo.safeParse({ ...valido, urgencia: "ya" }).success).toBe(false);
  });
  it("limita las fotos a 4", () => {
    expect(esquemaTrabajo.safeParse({ ...valido, cantidadFotos: "5" }).success).toBe(false);
  });
});

describe("esquemaFotos", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const cliente = "22222222-2222-2222-2222-222222222222";
  const otroCliente = "33333333-3333-3333-3333-333333333333";
  it("solo acepta rutas en <cliente>/<trabajo>/ del propio trabajo", () => {
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/${id}/0-1.jpg`]).success).toBe(true);
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/${id}/0-1.webp`]).success).toBe(true);
    expect(esquemaFotos(id, cliente).safeParse([`trabajos/${id}/0-1.jpg`]).success).toBe(false);
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/otro/0-1.jpg`]).success).toBe(false);
    expect(esquemaFotos(id, cliente).safeParse([`${otroCliente}/${id}/0-1.jpg`]).success).toBe(
      false,
    );
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/${id}/../x.jpg`]).success).toBe(false);
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/${id}/0-1.gif`]).success).toBe(false);
    expect(esquemaFotos(id, cliente).safeParse([`${cliente}/${id}/x/0-1.jpg`]).success).toBe(false);
  });
});

describe("esquemaTrabajo · direcciones y mails (LAB-53)", () => {
  it("rechaza una dirección exacta en la descripción y en el título", () => {
    const enDescripcion = esquemaTrabajo.safeParse({
      ...valido,
      descripcion: "Pérdida de agua en Independencia 2100, timbre roto, llamá al portero.",
    });
    expect(enDescripcion.success).toBe(false);
    const enTitulo = esquemaTrabajo.safeParse({ ...valido, titulo: "Gotera en Av. Colón 1234" });
    expect(enTitulo.success).toBe(false);
  });

  it("rechaza un email en la descripción con el mensaje de contacto", () => {
    const r = esquemaTrabajo.safeParse({
      ...valido,
      descripcion: "Mandame un correo a vecina@mail.com con las fotos del caño roto.",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresDeTrabajo(r.error).descripcion).toMatch(/No pongas tu teléfono/);
  });
});
