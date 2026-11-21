import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sello } from "./Sello";

describe("Sello", () => {
  it("es decorativo: aria-hidden y sin foco", () => {
    const { container } = render(<Sello />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("usa el token adorno y va girado", () => {
    const { container } = render(<Sello className="size-24" />);
    expect(container.querySelector("svg")).toHaveClass("text-adorno", "-rotate-12", "size-24");
  });

  it("solo se estampa si se pide", () => {
    const { container, rerender } = render(<Sello />);
    expect(container.querySelector("svg")).not.toHaveClass("sello-estampar");
    rerender(<Sello estampar />);
    expect(container.querySelector("svg")).toHaveClass("sello-estampar");
  });

  it("el texto circular va en mayúsculas y cada sello tiene su propio camino", () => {
    const { container } = render(
      <>
        <Sello texto="Verificado" />
        <Sello />
      </>,
    );
    expect(container.querySelector("textPath")).toHaveTextContent("VERIFICADO");
    const ids = Array.from(container.querySelectorAll("path[id]")).map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).not.toContain(":");
  });
});
