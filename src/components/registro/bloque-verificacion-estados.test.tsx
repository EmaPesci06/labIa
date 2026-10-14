import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BloqueVerificacion } from "./BloqueVerificacion";

const verif = (
  estado: "pendiente" | "aprobado" | "rechazado",
  motivoRechazo: string | null = null,
) => [
  {
    id: "v-1",
    tipo: "antecedentes" as const,
    estado,
    motivoRechazo,
    createdAt: "2026-10-12T00:00:00Z",
  },
];

describe("BloqueVerificacion: estados y accesibilidad", () => {
  it("muestra 'Falta subir' y la ayuda con el link de Reincidencia", () => {
    render(<BloqueVerificacion />);

    expect(screen.getAllByText("Falta subir").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Registro Nacional de Reincidencia" })).toHaveAttribute(
      "href",
      "https://www.argentina.gob.ar/justicia/reincidencia/antecedentespenales",
    );
  });

  it("muestra 'Subido · en revisión' para un documento pendiente", () => {
    render(<BloqueVerificacion verificaciones={verif("pendiente")} />);
    expect(screen.getByText("Subido · en revisión")).toBeInTheDocument();
  });

  it("muestra el motivo del rechazo y permite volver a subir", () => {
    render(<BloqueVerificacion verificaciones={verif("rechazado", "Está vencido")} />);

    expect(screen.getByText("Rechazado: Está vencido. Volvé a subirlo.")).toBeInTheDocument();
    expect(screen.getByText("Volver a subir")).toBeInTheDocument();
  });

  it("muestra el avance de la subida", () => {
    render(<BloqueVerificacion progreso={{ hechos: 1, total: 3 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Subiendo documentos… 1 de 3");
  });

  it("rechaza un archivo cuyo contenido no es lo que dice su extensión", async () => {
    const onElegir = vi.fn();
    render(<BloqueVerificacion onElegirDocumento={onElegir} />);

    const entrada = screen.getByLabelText(/Certificado de antecedentes/);
    const falso = new File(["esto no es un pdf"], "falso.pdf", { type: "application/pdf" });
    fireEvent.change(entrada, { target: { files: [falso] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Formato no válido");
    expect(onElegir).not.toHaveBeenCalled();
  });

  it("usa ids distintos en cada bloque y pide la cámara solo en las fotos", () => {
    render(
      <>
        <BloqueVerificacion tieneGas />
        <BloqueVerificacion tieneGas />
      </>,
    );
    const ids = [...document.querySelectorAll("input[type=file]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const [antecedentes] = screen.getAllByLabelText(/Certificado de antecedentes/);
    const [matricula] = screen.getAllByLabelText(/Constancia de matrícula/);
    expect(antecedentes).not.toHaveAttribute("capture");
    expect(matricula).toHaveAttribute("capture", "environment");
  });

  it("el botón de quitar mide 44 px", () => {
    render(<BloqueVerificacion documentosLocales={{ antecedentes: new File(["x"], "a.pdf") }} />);
    expect(screen.getByRole("button", { name: /Quitar archivo de Certificado/ })).toHaveClass(
      "size-11",
    );
  });
});
