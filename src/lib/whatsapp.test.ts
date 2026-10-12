import { describe, expect, it } from "vitest";

import { linkWhatsApp, normalizarTelefono } from "./whatsapp";

describe("normalizarTelefono", () => {
  it.each([
    ["223 555-1234", "+5492235551234"],
    ["0223 15 555 1234", "+5492235551234"],
    ["+54 9 223 555 1234", "+5492235551234"],
    ["+54 223 555 1234", "+5492235551234"],
    ["5492235551234", "+5492235551234"],
    ["(0223) 155-551234", "+5492235551234"],
    ["11 2345 6789", "+5491123456789"],
    ["011 15 2345-6789", "+5491123456789"],
    ["+54 9 11 2345 6789", "+5491123456789"],
    ["0221 15 456 7890", "+5492214567890"],
    ["555-1234", "+5492235551234"],
    ["15 555 1234", "+5492235551234"],
  ])("normaliza %s → %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  it.each([
    [""],
    ["   "],
    ["123"],
    ["hola"],
    ["223 555 12345"],
    ["223-555-123"],
    ["+1 415 555 1234"],
    ["0800 555 1234"],
    ["223 +555 1234"],
    ["223 555 1234 int. 2"],
  ])("devuelve null para %j", (entrada) => {
    expect(normalizarTelefono(entrada)).toBeNull();
  });
});

describe("linkWhatsApp", () => {
  it("saca el + y codifica el mensaje", () => {
    expect(linkWhatsApp("+5492235551234", "Hola, te vi en LabÍA. ¿Podés mañana?")).toBe(
      "https://wa.me/5492235551234?text=Hola%2C%20te%20vi%20en%20Lab%C3%8DA.%20%C2%BFPod%C3%A9s%20ma%C3%B1ana%3F",
    );
  });

  it("codifica & y saltos de línea", () => {
    expect(linkWhatsApp("+5492235551234", "Gas & agua\nurgente")).toBe(
      "https://wa.me/5492235551234?text=Gas%20%26%20agua%0Aurgente",
    );
  });

  it("omite el texto si el mensaje está vacío", () => {
    expect(linkWhatsApp("+5492235551234", "  ")).toBe("https://wa.me/5492235551234");
  });

  it("rechaza teléfonos que no están en E.164", () => {
    expect(() => linkWhatsApp("223 555 1234", "Hola")).toThrow(RangeError);
  });

  it("encadena con normalizarTelefono", () => {
    const telefono = normalizarTelefono("0223 15 555 1234");
    expect(telefono).not.toBeNull();
    expect(linkWhatsApp(telefono ?? "", "Hola")).toBe("https://wa.me/5492235551234?text=Hola");
  });
});
