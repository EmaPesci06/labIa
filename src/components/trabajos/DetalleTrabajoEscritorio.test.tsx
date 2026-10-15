import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TrabajoParaMi } from "@/lib/trabajos/consulta";

vi.mock("@/lib/trabajos/acciones", () => ({
  postularme: vi.fn(),
  retirarPostulacion: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { DetalleTrabajoEscritorio } from "./DetalleTrabajoEscritorio";

const base: TrabajoParaMi = {
  id: "11111111-1111-4111-8111-111111111111",
  oficio: "gas",
  titulo: "Olor a gas",
  descripcion: "Olor cerca del horno.",
  urgencia: "lo_antes_posible",
  presupuestoEstimado: null,
  fotos: [],
  barrioId: 2,
  barrioNombre: "La Perla",
  distanciaKm: 0.8,
  cantidadPostulaciones: 2,
  yaMePostule: false,
  createdAt: new Date().toISOString(),
  clienteNombre: "Carlos",
  clienteApellidoInicial: "M",
};

const otro: TrabajoParaMi = {
  ...base,
  id: "22222222-2222-4222-8222-222222222222",
  titulo: "Otro trabajo",
};

describe("DetalleTrabajoEscritorio (LAB-45)", () => {
  it("al cambiar de trabajo el formulario arranca vacío (no arrastra lo escrito)", async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<DetalleTrabajoEscritorio trabajo={base} />);

    await usuario.type(screen.getByLabelText(/Mensaje para/), "Mensaje para el primero");
    expect(screen.getByLabelText(/Mensaje para/)).toHaveValue("Mensaje para el primero");

    rerender(<DetalleTrabajoEscritorio trabajo={otro} />);

    expect(screen.getByLabelText(/Mensaje para/)).toHaveValue("");
  });

  it("muestra la postulación propia del trabajo elegido y el botón para retirarla", () => {
    render(
      <DetalleTrabajoEscritorio
        trabajo={{ ...base, yaMePostule: true }}
        miPostulacion={{
          id: "p1",
          mensaje: "Puedo ir hoy a las 17 h.",
          precioEstimado: 40000,
          senaPropuesta: 10000,
          estado: "enviada",
          createdAt: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText("Postulación enviada")).toBeTruthy();
    expect(screen.getByText("Puedo ir hoy a las 17 h.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retirar postulación" })).toBeTruthy();
    expect(screen.queryByLabelText(/Mensaje para/)).toBeNull();
  });

  it("usa el texto de postulantes compartido", () => {
    render(<DetalleTrabajoEscritorio trabajo={base} />);
    expect(screen.getByText("2 postulantes")).toBeTruthy();
  });
});
