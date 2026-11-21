import { existsSync } from "node:fs";
import { join } from "node:path";

import { render } from "@react-email/render";
import { createElement, type ComponentType } from "react";
import { describe, expect, it } from "vitest";

import BienvenidaCliente from "@/emails/bienvenida_cliente";
import BienvenidaProfesional from "@/emails/bienvenida_profesional";
import CuentaSuspendida from "@/emails/cuenta_suspendida";
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
  cuenta_suspendida: CuentaSuspendida as unknown as ConVistaPrevia,
};

/** Emails de novedades: llevan el enlace de baja del pie. */
const CON_BAJA = ["eligieron_a_otro", "pedir_resena", "trabajos_cerca"];
/** Emails que llevan el enlace "Elegir qué emails recibo" (incluye los de novedades). */
const CON_PREFERENCIAS = [...CON_BAJA, "nueva_postulacion", "te_eligieron"];

const URL_BAJA = "https://labia.example/baja#t=ejemplo";
const URL_PREFERENCIAS = "https://labia.example/cuenta/emails";

const vista = (c: ConVistaPrevia) =>
  createElement(c as unknown as ComponentType<object>, c.PreviewProps);

describe.each(Object.entries(PLANTILLAS))("plantilla %s", (nombre, Plantilla) => {
  it("renderiza HTML con la marca y el pie de Oficio Seguro", async () => {
    const html = await render(vista(Plantilla));
    expect(html).toContain("Oficio Seguro");
    expect(html).toContain("Oficio Seguro, Mar del Plata");
  });

  it("pone el enlace de baja y el de preferencias solo donde corresponde", async () => {
    const html = await render(vista(Plantilla));
    expect(html.includes(URL_BAJA)).toBe(CON_BAJA.includes(nombre));
    expect(html.includes(URL_PREFERENCIAS)).toBe(CON_PREFERENCIAS.includes(nombre));
  });

  it("renderiza la versión de texto plano", async () => {
    const texto = await render(vista(Plantilla), { plainText: true });
    expect(texto).toContain("Oficio Seguro, Mar del Plata");
    expect(texto).not.toContain("<");
  });

  it("no incluye teléfonos, DNI ni direcciones", async () => {
    const texto = await render(vista(Plantilla), { plainText: true });
    expect(texto).not.toMatch(/\+54|\b\d{8}\b|wa\.me|whatsapp\.com/i);
  });
});

describe("marca nueva", () => {
  it("el botón es del color de acción #b8441b con texto blanco", async () => {
    const html = await render(vista(BienvenidaCliente as unknown as ConVistaPrevia));
    expect(html.toLowerCase()).toContain("background-color:#b8441b");
    expect(html.toLowerCase()).toContain("color:#ffffff");
  });

  it("el logo es un PNG alojado con texto alternativo, no un SVG", async () => {
    const html = await render(vista(BienvenidaCliente as unknown as ConVistaPrevia));
    expect(html).toMatch(/<img[^>]+src="[^"]+\/emails\/logo\.png"/);
    expect(html).toContain('alt="Oficio Seguro"');
    expect(html).not.toContain(".svg");
    expect(existsSync(join(process.cwd(), "public/emails/logo.png"))).toBe(true);
  });

  it("usa el fondo y el encabezado de la paleta, sin restos de Verano en la costa", async () => {
    const html = (
      await render(vista(BienvenidaCliente as unknown as ConVistaPrevia))
    ).toLowerCase();
    expect(html).toContain("background-color:#eaf0ee");
    expect(html).toContain("background-color:#16231f");
    expect(html).not.toMatch(/#0e7c86|#123b4a|#fff3d6|repeating-linear-gradient/);
  });
});

describe("cuenta suspendida", () => {
  it("usa la cabecera gris verdosa #47564f", async () => {
    const html = await render(vista(CuentaSuspendida as unknown as ConVistaPrevia));
    expect(html.toLowerCase()).toContain("background-color:#47564f");
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
