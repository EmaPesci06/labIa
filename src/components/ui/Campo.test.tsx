import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Campo } from "./Campo";

describe("Campo", () => {
  it("asocia la etiqueta con el campo", () => {
    render(<Campo etiqueta="Nombre" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("el error queda asociado con aria-invalid y aria-describedby", () => {
    render(
      <Campo
        etiqueta="Email"
        error="Ingresá un email válido."
        ayuda="Usamos tu email para avisarte."
      />,
    );
    const campo = screen.getByLabelText("Email");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription(
      "Ingresá un email válido. Usamos tu email para avisarte.",
    );
  });

  it("el borde usa el token borde (visible) y el error lo pasa a error; sin anillo extra", () => {
    render(
      <>
        <Campo etiqueta="Uno" />
        <Campo etiqueta="Dos" error="Falta." />
      </>,
    );
    expect(screen.getByLabelText("Uno")).toHaveClass(
      "border-borde",
      "bg-campo",
      "focus-visible:ring-0",
    );
    expect(screen.getByLabelText("Dos")).toHaveClass("aria-invalid:border-error");
  });

  it("sin error no marca el campo como inválido", () => {
    render(<Campo etiqueta="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("teléfono: type tel e inputMode tel", () => {
    render(<Campo variante="telefono" etiqueta="Celular" />);
    const campo = screen.getByLabelText("Celular");
    expect(campo).toHaveAttribute("type", "tel");
    expect(campo).toHaveAttribute("inputmode", "tel");
  });

  it("pesos: muestra el prefijo $ y teclado numérico", () => {
    render(<Campo variante="pesos" etiqueta="Presupuesto" />);
    expect(screen.getByLabelText("Presupuesto")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("área: el contador cuenta los caracteres", async () => {
    render(<Campo variante="area" etiqueta="Descripción" maxLength={500} />);
    expect(screen.getByText("0/500")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Descripción"), "Hola");
    expect(screen.getByText("4/500")).toBeInTheDocument();
  });

  it("selección: abre opciones, elige una y envía su valor en el formulario", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Campo
          variante="seleccion"
          etiqueta="Oficio"
          name="oficio"
          placeholder="Elegí un oficio"
          opciones={[
            { valor: "plomeria", etiqueta: "Plomería" },
            { valor: "gas", etiqueta: "Gas" },
          ]}
        />
      </form>,
    );
    const combobox = screen.getByRole("combobox", { name: "Oficio" });
    expect(combobox).toBeInTheDocument();

    await user.click(combobox);
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await user.click(screen.getByRole("option", { name: "Gas" }));

    expect(combobox).toHaveTextContent("Gas");
    expect(screen.getByRole("status")).toHaveTextContent("Oficio: Gas");
    const form = combobox.closest("form");
    expect(form).not.toBeNull();
    expect(new FormData(form!).get("oficio")).toBe("gas");
  });
});
