import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { Hoja } from "./Hoja";

function Ejemplo({ descripcion }: { descripcion?: string }) {
  const [abierta, setAbierta] = useState(false);
  const botonRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={botonRef} type="button" onClick={() => setAbierta(true)}>
        Abrir
      </button>
      <Hoja
        abierta={abierta}
        onCambioAbierta={setAbierta}
        titulo="Antes de contactar"
        descripcion={descripcion}
        devolverFocoA={botonRef}
      >
        <button type="button">Abrir WhatsApp</button>
      </Hoja>
    </>
  );
}

describe("Hoja", () => {
  it("es un diálogo con el título como nombre y usa Sheet de shadcn", async () => {
    render(<Ejemplo descripcion="Leé estos consejos antes de escribir." />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const dialogo = screen.getByRole("dialog", { name: "Antes de contactar" });
    expect(dialogo).toBeInTheDocument();
    expect(dialogo).toHaveAttribute("data-slot", "sheet-content");
    expect(dialogo).toHaveAttribute("data-side", "bottom");
    expect(screen.getByText("Leé estos consejos antes de escribir.")).toBeInTheDocument();
  });

  it("pasa el foco al diálogo y lo mantiene adentro", async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const dialogo = screen.getByRole("dialog");
    await waitFor(() => expect(dialogo).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
  });

  it("se cierra con Esc y devuelve el foco al botón que la abrió", async () => {
    render(<Ejemplo />);
    const abrir = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(abrir);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(abrir).toHaveFocus());
  });

  it("se cierra con la X y devuelve el foco al botón que la abrió", async () => {
    render(<Ejemplo />);
    const abrir = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(abrir);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(abrir).toHaveFocus());
  });
});
