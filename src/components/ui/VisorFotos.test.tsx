import { fireEvent, render, screen } from "@testing-library/react";
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

describe("VisorFotos como Dialog con Carousel (LAB-87)", () => {
  const FOTOS = [PUBLICA, `${PUBLICA}?2`, `${PUBLICA}?3`];

  it("abre el visor al tocar una miniatura, con título, contador y botón Cerrar", () => {
    render(<VisorFotos fotos={FOTOS} contexto="trabajos de Ana" />);

    fireEvent.click(screen.getByRole("button", { name: "Ver foto 2 de 3 de trabajos de Ana" }));

    expect(screen.getByRole("dialog", { name: "Foto 2 de 3 de trabajos de Ana" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Fotos de trabajos de Ana" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy();
  });

  it("muestra las flechas solo con más de una foto y se cierra con la X", () => {
    const { rerender } = render(<VisorFotos fotos={FOTOS} contexto="Gas" />);
    fireEvent.click(screen.getByRole("button", { name: /Ver foto 1 de 3/ }));
    expect(screen.getByRole("button", { name: "Foto anterior" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Foto siguiente" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<VisorFotos fotos={[PUBLICA]} contexto="Gas" />);
    fireEvent.click(screen.getByRole("button", { name: /Ver foto 1 de 1/ }));
    expect(screen.queryByRole("button", { name: "Foto siguiente" })).toBeNull();
  });
});
