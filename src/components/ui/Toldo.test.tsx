import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Toldo } from "./Toldo";
import { AvisoPantalla } from "./AvisoPantalla";
import { screen } from "@testing-library/react";

describe("Toldo", () => {
  it("es decorativo (aria-hidden) y usa la utilidad toldo", () => {
    const { container } = render(<Toldo />);
    const toldo = container.firstElementChild;
    expect(toldo).toHaveAttribute("aria-hidden", "true");
    expect(toldo).toHaveClass("toldo");
  });

  it("por defecto es turquesa de 14 px", () => {
    const { container } = render(<Toldo />);
    expect(container.firstElementChild).toHaveClass(
      "[--toldo-color:var(--color-accion)]",
      "[--toldo-alto:14px]",
    );
  });

  it.each([
    ["destacado", "[--toldo-color:var(--color-destacado)]"],
    ["texto", "[--toldo-color:var(--color-texto)]"],
    ["adorno", "[--toldo-color:var(--color-adorno)]"],
  ] as const)("color %s usa su token", (color, clase) => {
    const { container } = render(<Toldo color={color} />);
    expect(container.firstElementChild).toHaveClass(clase);
  });

  it.each([
    [18, "[--toldo-alto:18px]"],
    [22, "[--toldo-alto:22px]"],
    [26, "[--toldo-alto:26px]"],
  ] as const)("alto %i px", (alto, clase) => {
    const { container } = render(<Toldo alto={alto} />);
    expect(container.firstElementChild).toHaveClass(clase);
  });
});

describe("AvisoPantalla", () => {
  it("muestra título en h1, texto y la acción", () => {
    render(
      <AvisoPantalla
        titulo="Te quedaste sin conexión"
        texto="Revisá tu internet y volvé a intentar."
        accion={<button type="button">Reintentar</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Te quedaste sin conexión" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Revisá tu internet y volvé a intentar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("con nivel 2 el título es h2", () => {
    render(<AvisoPantalla titulo="Enlace vencido" nivel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Enlace vencido" })).toBeInTheDocument();
  });

  it("sin texto ni acción solo muestra el título", () => {
    render(<AvisoPantalla titulo="Enlace vencido" />);
    expect(screen.getByRole("heading", { name: "Enlace vencido" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
