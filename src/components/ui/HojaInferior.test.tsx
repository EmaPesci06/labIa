import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { HojaInferior } from "./HojaInferior";

function Ejemplo() {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}>
        Abrir
      </button>
      <HojaInferior abierta={abierta} onCambioAbierta={setAbierta} titulo="Antes de contactar">
        <button type="button">Abrir WhatsApp</button>
      </HojaInferior>
    </>
  );
}

describe("HojaInferior", () => {
  it("es un diálogo con el título como nombre", async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByRole("dialog", { name: "Antes de contactar" })).toBeInTheDocument();
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

  it("se cierra con Esc", async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("se cierra con la X", async () => {
    render(<Ejemplo />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
