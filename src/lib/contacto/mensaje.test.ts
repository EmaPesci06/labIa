import { describe, expect, it } from "vitest";

import { armarMensajeContacto } from "./mensaje";

describe("armarMensajeContacto", () => {
  it("desde el perfil saluda por nombre y nombra el barrio del cliente", () => {
    expect(
      armarMensajeContacto({
        origen: "perfil",
        nombreProfesional: "Martín Gómez",
        profesion: "gasista",
        barrioCliente: "La Perla",
      }),
    ).toBe(
      "Hola Martín Gómez, te encontré en LabÍA. Necesito un/a gasista en La Perla. ¿Podés ayudarme?",
    );
  });

  it("sin barrio cargado omite la parte del lugar", () => {
    expect(
      armarMensajeContacto({
        origen: "perfil",
        nombreProfesional: "Martín G.",
        profesion: "plomero",
        barrioCliente: null,
      }),
    ).toBe("Hola Martín G., te encontré en LabÍA. Necesito un/a plomero. ¿Podés ayudarme?");
  });

  it("desde una postulación menciona el trabajo y propone coordinar", () => {
    expect(
      armarMensajeContacto({
        origen: "postulacion",
        nombreProfesional: "Martín Gómez",
        profesion: "gasista",
        barrioCliente: "Centro",
        tituloTrabajo: "Caldera sin gas",
      }),
    ).toBe('Hola Martín Gómez, te elegí en LabÍA para el trabajo "Caldera sin gas". ¿Coordinamos?');
  });
});
