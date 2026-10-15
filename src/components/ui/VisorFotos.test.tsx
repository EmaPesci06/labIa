import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisorFotos, esUrlFirmada } from "./VisorFotos";

const FIRMADA =
  "https://proyecto.supabase.co/storage/v1/object/sign/fotos-trabajos/c/t/0-1.jpg?token=abc";
const PUBLICA = "https://proyecto.supabase.co/storage/v1/object/public/fotos/perfiles/u/1.jpg";

describe("esUrlFirmada", () => {
  it("reconoce las URL firmadas del bucket privado y no las públicas", () => {
    expect(esUrlFirmada(FIRMADA)).toBe(true);
    expect(esUrlFirmada(PUBLICA)).toBe(false);
  });
});

describe("VisorFotos con URL firmadas (LAB-52)", () => {
  it("muestra la foto firmada tal cual, sin pasar por el optimizador de next/image", () => {
    const { container } = render(
      <VisorFotos fotos={[FIRMADA]} contexto="Olor a gas" miniaturas="apaisadas" />,
    );

    const imagen = container.querySelector("img");
    expect(imagen).not.toBeNull();
    expect(imagen?.getAttribute("src")).toBe(FIRMADA);
    expect(imagen?.getAttribute("src")).not.toContain("/_next/image");
  });

  it("las URL públicas siguen pasando por el optimizador", () => {
    const { container } = render(<VisorFotos fotos={[PUBLICA]} contexto="Trabajos de Ana" />);

    const imagen = container.querySelector("img");
    expect(imagen?.getAttribute("src")).toContain("/_next/image");
  });
});
