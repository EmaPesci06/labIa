import { render } from "@react-email/render";
import { createElement, type ComponentType } from "react";
import { describe, expect, it } from "vitest";

import BienvenidaCliente from "@/emails/bienvenida_cliente";
import BienvenidaProfesional from "@/emails/bienvenida_profesional";
import DocumentoRechazado from "@/emails/documento_rechazado";
import EligieronAOtro from "@/emails/eligieron_a_otro";
import NuevaPostulacion, { asuntoNuevaPostulacion } from "@/emails/nueva_postulacion";
import PedirResena from "@/emails/pedir_resena";
import PerfilPublicado from "@/emails/perfil_publicado";
import TeEligieron from "@/emails/te_eligieron";
import TrabajosCerca from "@/emails/trabajos_cerca";

type ConVistaPrevia = ComponentType<never> & { PreviewProps: object };

const PLANTILLAS: Record<string, ConVistaPrevia> = {
  bienvenida_cliente: BienvenidaCliente as unknown as ConVistaPrevia,
  bienvenida_profesional: BienvenidaProfesional as unknown as ConVistaPrevia,
  perfil_publicado: PerfilPublicado as unknown as ConVistaPrevia,
  documento_rechazado: DocumentoRechazado as unknown as ConVistaPrevia,
  nueva_postulacion: NuevaPostulacion as unknown as ConVistaPrevia,
  te_eligieron: TeEligieron as unknown as ConVistaPrevia,
  eligieron_a_otro: EligieronAOtro as unknown as ConVistaPrevia,
  trabajos_cerca: TrabajosCerca as unknown as ConVistaPrevia,
  pedir_resena: PedirResena as unknown as ConVistaPrevia,
};

const vista = (c: ConVistaPrevia) =>
  createElement(c as unknown as ComponentType<object>, c.PreviewProps);

describe.each(Object.entries(PLANTILLAS))("plantilla %s", (_nombre, Plantilla) => {
  it("renderiza HTML con la marca, el pie y el link de baja", async () => {
    const html = await render(vista(Plantilla));
    expect(html).toContain("LabÍA");
    expect(html).toContain("Recibís este email porque tenés cuenta en LabÍA");
    expect(html).toContain("https://labia.example/baja?t=ejemplo");
    expect(html).toContain("https://labia.example/cuenta/emails");
  });

  it("renderiza la versión de texto plano", async () => {
    const texto = await render(vista(Plantilla), { plainText: true });
    expect(texto).toContain("Recibís este email porque tenés cuenta en LabÍA");
    expect(texto).not.toContain("<");
  });

  it("no incluye teléfonos, DNI ni direcciones", async () => {
    const texto = await render(vista(Plantilla), { plainText: true });
    expect(texto).not.toMatch(/\+54|\b\d{8}\b|wa\.me|whatsapp\.com/i);
  });
});

describe("botón de acción", () => {
  it("es naranja #B84A25 con texto blanco", async () => {
    const html = await render(vista(BienvenidaCliente as unknown as ConVistaPrevia));
    expect(html.toLowerCase()).toContain("background-color:#b84a25");
    expect(html.toLowerCase()).toContain("color:#ffffff");
  });
});

describe("nueva_postulacion", () => {
  const base = {
    nombre: "Laura",
    tituloTrabajo: "Arreglar la canilla",
    urlTrabajo: "https://labia.example/trabajos/1",
  };
  const una = { nombreProfesional: "Pablo Gómez", oficio: "Plomería", precio: null, sena: null };

  it("agrupa en un solo asunto cuando hay varias", () => {
    expect(asuntoNuevaPostulacion({ ...base, postulaciones: [una, una, una] })).toBe(
      "3 profesionales se postularon a Arreglar la canilla",
    );
  });

  it("nombra al profesional cuando hay una sola", () => {
    expect(asuntoNuevaPostulacion({ ...base, postulaciones: [una] })).toBe(
      "Pablo Gómez se postuló a Arreglar la canilla",
    );
  });
});
