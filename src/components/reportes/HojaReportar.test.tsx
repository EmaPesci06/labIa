import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reportes/acciones", () => ({
  enviarReporte: vi.fn().mockResolvedValue({ exito: true, motivoEnviado: "datos_falsos" }),
}));

vi.mock("@/lib/metricas", () => ({
  registrarEvento: vi.fn(),
}));

import { HojaReportar } from "./HojaReportar";

const UUID_OBJETIVO = "11111111-1111-4111-8111-111111111111";

describe("HojaReportar", () => {
  it("muestra las 5 opciones de motivo", () => {
    render(
      <HojaReportar
        abierta={true}
        onCambioAbierta={() => {}}
        objetivoTipo="perfil"
        objetivoId={UUID_OBJETIVO}
        tituloObjetivo="Martín Gómez"
      />,
    );

    expect(screen.getByRole("dialog", { name: "¿Qué pasó?" })).toBeInTheDocument();
    expect(screen.getByText("Datos falsos o se hace pasar por otra persona")).toBeInTheDocument();
    expect(screen.getByText("Comportamiento inadecuado o inseguro")).toBeInTheDocument();
    expect(screen.getByText("Intento de estafa o pedido de pago por fuera")).toBeInTheDocument();
    expect(screen.getByText("Contenido inapropiado")).toBeInTheDocument();
    expect(screen.getByText("Otro")).toBeInTheDocument();
  });

  it("muestra advertencia del 911 al elegir comportamiento", async () => {
    const user = userEvent.setup();
    render(
      <HojaReportar
        abierta={true}
        onCambioAbierta={() => {}}
        objetivoTipo="perfil"
        objetivoId={UUID_OBJETIVO}
      />,
    );

    expect(screen.queryByText(/Si estás en peligro, llamá al 911/)).not.toBeInTheDocument();

    const radioComportamiento = screen.getByLabelText("Comportamiento inadecuado o inseguro");
    await user.click(radioComportamiento);

    expect(screen.getByText(/Si estás en peligro, llamá al 911/)).toBeInTheDocument();
  });

  it("actualiza el contador de caracteres del detalle", async () => {
    const user = userEvent.setup();
    render(
      <HojaReportar
        abierta={true}
        onCambioAbierta={() => {}}
        objetivoTipo="trabajo"
        objetivoId={UUID_OBJETIVO}
      />,
    );

    expect(screen.getByText(/0 \/ 500/)).toBeInTheDocument();
    const textarea = screen.getByLabelText(/Detalle opcional/);
    await user.type(textarea, "Texto de prueba");
    expect(screen.getByText(/15 \/ 500/)).toBeInTheDocument();
  });

  it("muestra mensaje para iniciar sesión si el usuario no está autenticado", () => {
    render(
      <HojaReportar
        abierta={true}
        onCambioAbierta={() => {}}
        objetivoTipo="perfil"
        objetivoId={UUID_OBJETIVO}
        estaAutenticado={false}
        hrefIngreso="/ingresar?volver=%2Fprofesionales%2F123"
      />,
    );

    expect(screen.getByText(/necesitás iniciar sesión en tu cuenta de LabÍA/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ingresar a mi cuenta" })).toHaveAttribute(
      "href",
      "/ingresar?volver=%2Fprofesionales%2F123",
    );
  });
});
