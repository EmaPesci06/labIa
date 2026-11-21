import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FranjaRubro } from "./FranjaRubro";

describe("FranjaRubro", () => {
  it("muestra el rubro como texto y lleva la trama", () => {
    render(<FranjaRubro>Gasista</FranjaRubro>);
    const franja = screen.getByText("Gasista");
    expect(franja).toHaveClass("trama", "bg-encabezado", "text-sobre-encabezado", "font-etiqueta");
  });

  it("acepta clases extra", () => {
    render(<FranjaRubro className="rounded-t-3xl">Plomero</FranjaRubro>);
    expect(screen.getByText("Plomero")).toHaveClass("rounded-t-3xl");
  });
});
