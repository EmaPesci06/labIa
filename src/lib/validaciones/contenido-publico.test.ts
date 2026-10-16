import { describe, expect, it } from "vitest";

import { nombreCompleto } from "./registro-cliente";
import { esquemaNombreDeProveedor } from "./cuenta";
import {
  LARGO_MAXIMO_ANALISIS,
  MENSAJE_CONTENIDO_PUBLICO,
  detectarDatoDeContacto,
  sinDatosDeContacto,
  tieneDatosDeContacto,
  valorDeDigito,
} from "./contenido-publico";

describe("dígitos de otros alfabetos (LAB-53, paridad con la base)", () => {
  it.each([
    ["٢٢٣ ٥٥٥ ١٢٣٤", "telefono"],
    ["२२३ ५५५ १२३४", "telefono"],
    ["２２３ ５５５ １２３４", "telefono"],
  ])("«%s» se lee como teléfono", (texto, tipo) => {
    expect(detectarDatoDeContacto(texto)).toBe(tipo);
  });

  it("el valor de cada dígito sale de su bloque", () => {
    expect(valorDeDigito("٣")).toBe("3");
    expect(valorDeDigito("९")).toBe("9");
    expect(valorDeDigito("５")).toBe("5");
  });

  it("un precio con dígitos árabes no es teléfono", () => {
    expect(tieneDatosDeContacto("$ ١٥٠٠٠٠٠٠")).toBe(false);
  });
});

describe("nombre en el alta y en la cuenta (LAB-53)", () => {
  it("el nombre completo del registro no lleva teléfono ni email", () => {
    expect(nombreCompleto.safeParse("Ana 2235551234").success).toBe(false);
    expect(nombreCompleto.safeParse("ana@correo.com Pérez").success).toBe(false);
    expect(nombreCompleto.safeParse("María de los Ángeles").success).toBe(true);
  });

  it("el nombre que llega de un proveedor se valida igual", () => {
    expect(esquemaNombreDeProveedor.safeParse("Lucía").success).toBe(true);
    expect(esquemaNombreDeProveedor.safeParse("Lucía 2235551234").success).toBe(false);
  });
});

describe("detectarDatoDeContacto · bloquea", () => {
  it.each([
    ["llamame al 223 555-1234", "telefono"],
    ["mi cel es 2235551234", "telefono"],
    ["+54 9 223 555 1234", "telefono"],
    ["(0223) 495-1234", "telefono"],
    ["223.555.1234 después de las 18", "telefono"],
    ["２２３ ５５５ １２３４", "telefono"],
    ["escribime a laura@correo.com", "email"],
    ["laura arroba gmail punto com", "email"],
    ["laura punto com, escribime", "email"],
    ["laura(at)gmail.com", "email"],
    ["hablame por wa.me/5492235551234", "mensajeria"],
    ["buscame en instagram.com/plomero_mdp", "mensajeria"],
    ["Vivo en Av. Colón 1234, puerta negra", "direccion"],
    ["Trabajo en la calle 12 n 1234", "direccion"],
    ["Pasaje Mitre 500 timbre 3", "direccion"],
    ["Independencia 2100 PB", "direccion"],
    ["Mitre n° 1234, al fondo", "direccion"],
  ])("detecta en «%s» (%s)", (texto, tipo) => {
    expect(detectarDatoDeContacto(texto)).toBe(tipo);
    expect(tieneDatosDeContacto(texto)).toBe(true);
    expect(sinDatosDeContacto(texto)).toBe(false);
  });
});

describe("detectarDatoDeContacto · deja pasar", () => {
  it.each([
    "Son 3 canillas y 12 metros de caño",
    "Presupuesto previo: $ 150.000",
    "Precio de referencia $15000 por visita",
    "Presupuesto de $15.000.000 con materiales incluidos",
    "Presupuesto de $ 15000000 sin materiales",
    "Trabajo en 2x3 m de living",
    "Tablero de 220 V y 32 A, 2 disyuntores",
    "Cambio 4 canillas y 1 termotanque de 80 litros",
    "Disponible de lunes a viernes de 8 a 18 hs",
    "Trabajé entre 2020-2024 en obras de Chauvín",
    "Fecha tentativa 12.03.2026 a la mañana",
    "trabajo el 12 03 2026 por la mañana",
    "Ya tengo 15 años de experiencia en gas",
    "Presupuesto 2025 para el baño completo",
    "Fiat Palio 1998 2000 cc, motor nafta",
    "Caño de 1200 mm y 3 codos",
    "Gasista matriculado 12345, con matrícula al día",
    "Matrícula N° 12345 de gas natural",
    "Calle 3 de Abril, a la vuelta de la plaza",
    "Av. Independencia y calle 12, esquina con kiosco",
    "",
  ])("no bloquea «%s»", (texto) => {
    expect(detectarDatoDeContacto(texto)).toBeNull();
    expect(sinDatosDeContacto(texto)).toBe(true);
  });

  it("una calle sin número no es dirección exacta", () => {
    expect(detectarDatoDeContacto("Trabajo sobre calle Independencia, zona céntrica")).toBeNull();
  });

  it("una lista de dígitos sueltos no cuenta como teléfono", () => {
    expect(detectarDatoDeContacto("Medidas: 1 2 3 4 5 6 7 8 cm")).toBeNull();
  });
});

describe("límites de costo (LAB-53, hallazgo ReDoS)", () => {
  it("un texto que pasa el largo máximo se trata como contacto, sin analizarlo", () => {
    const inicio = performance.now();
    expect(tieneDatosDeContacto("a".repeat(LARGO_MAXIMO_ANALISIS + 1))).toBe(true);
    expect(tieneDatosDeContacto("a".repeat(200_000))).toBe(true);
    expect(performance.now() - inicio).toBeLessThan(100);
  });

  it("un texto de 5000 caracteres con dígitos y separadores responde en menos de 100 ms", () => {
    const inicio = performance.now();
    detectarDatoDeContacto("1 ".repeat(2500));
    detectarDatoDeContacto("Calle ".repeat(833) + "x");
    expect(performance.now() - inicio).toBeLessThan(100);
  });
});

describe("sinDatosDeContacto", () => {
  it("acepta null y vacío (campos opcionales)", () => {
    expect(sinDatosDeContacto(null)).toBe(true);
    expect(sinDatosDeContacto(undefined)).toBe(true);
    expect(sinDatosDeContacto("")).toBe(true);
  });

  it("tiene un mensaje en castellano para el campo", () => {
    expect(MENSAJE_CONTENIDO_PUBLICO).toBe(
      "No pongas teléfonos, emails ni direcciones: el contacto es por WhatsApp desde la app.",
    );
  });
});
