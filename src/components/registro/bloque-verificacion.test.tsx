import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BloqueVerificacion } from "./BloqueVerificacion";

describe("BloqueVerificacion", () => {
  it("muestra el título y los documentos base", () => {
    render(<BloqueVerificacion tieneGas={false} />);

    expect(screen.getByRole("heading", { name: "Verificación obligatoria" })).toBeInTheDocument();
    expect(screen.getByText("DNI, frente y dorso")).toBeInTheDocument();
    expect(screen.getByText("Certificado de antecedentes")).toBeInTheDocument();
    expect(screen.queryByText("Constancia de matrícula")).not.toBeInTheDocument();
  });

  it("muestra la constancia de matrícula si tiene el oficio gas", () => {
    render(<BloqueVerificacion tieneGas={true} />);

    expect(screen.getByText("Constancia de matrícula")).toBeInTheDocument();
  });

  it("despliega los campos de frente y dorso al hacer clic en DNI", async () => {
    render(<BloqueVerificacion />);

    const botonDni = screen.getByRole("button", { name: /DNI, frente y dorso/i });
    expect(screen.queryByText("Frente del DNI")).not.toBeInTheDocument();

    await userEvent.click(botonDni);
    expect(screen.getByText("Frente del DNI")).toBeInTheDocument();
    expect(screen.getByText("Dorso del DNI")).toBeInTheDocument();
  });

  it("permite elegir un archivo y llama a onElegirDocumento", async () => {
    const onElegir = vi.fn();
    render(<BloqueVerificacion onElegirDocumento={onElegir} />);

    const entrada = document.getElementById("doc-antecedentes") as HTMLInputElement;
    expect(entrada).toBeInTheDocument();

    const archivo = new File(["dummy pdf content"], "antecedentes.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(entrada, { target: { files: [archivo] } });

    expect(onElegir).toHaveBeenCalledWith("antecedentes", archivo);
  });

  it("muestra error si el archivo supera los 8 MB", async () => {
    const onElegir = vi.fn();
    render(<BloqueVerificacion onElegirDocumento={onElegir} />);

    const entrada = document.getElementById("doc-antecedentes") as HTMLInputElement;
    const archivoGrande = new File([new Uint8Array(9 * 1024 * 1024)], "pesado.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(entrada, { target: { files: [archivoGrande] } });

    expect(onElegir).not.toHaveBeenCalled();
    expect(screen.getByText("El archivo no puede superar los 8 MB.")).toBeInTheDocument();
  });

  it("muestra el estado remoto de verificación si ya fue enviado", () => {
    render(
      <BloqueVerificacion
        verificaciones={[
          {
            id: "v-1",
            tipo: "antecedentes",
            estado: "aprobado",
            motivoRechazo: null,
            createdAt: "2026-10-12T00:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Verificado")).toBeInTheDocument();
  });
});
