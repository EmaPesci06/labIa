import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BloqueVerificacion } from "./BloqueVerificacion";

const casilla = () => screen.getByRole("checkbox", { name: /Acepto que LabÍA trate mi DNI/ });

describe("BloqueVerificacion: consentimiento para datos sensibles (LAB-43)", () => {
  it("sin consentimiento tildado, la entrada de antecedentes queda deshabilitada", () => {
    render(<BloqueVerificacion consentimiento={{ tildado: false, onCambio: vi.fn() }} />);

    expect(casilla()).not.toBeChecked();
    expect(screen.getByLabelText(/Certificado de antecedentes/)).toBeDisabled();
  });

  it("al tildar la casilla llama a onCambio con true", async () => {
    const onCambio = vi.fn();
    render(<BloqueVerificacion consentimiento={{ tildado: false, onCambio }} />);

    await userEvent.click(casilla());
    expect(onCambio).toHaveBeenCalledWith(true);
  });

  it("con el consentimiento tildado, la entrada queda habilitada", () => {
    render(<BloqueVerificacion consentimiento={{ tildado: true, onCambio: vi.fn() }} />);

    expect(casilla()).toBeChecked();
    expect(screen.getByLabelText(/Certificado de antecedentes/)).toBeEnabled();
  });

  it("sin la prop consentimiento no muestra la casilla (uso sin formulario)", () => {
    render(<BloqueVerificacion />);

    expect(screen.queryByRole("checkbox", { name: /Acepto que LabÍA/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Certificado de antecedentes/)).toBeEnabled();
  });
});
