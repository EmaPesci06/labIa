import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrabajoParaMi } from "@/lib/trabajos/consulta";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("./DetalleTrabajoEscritorio", () => ({ DetalleTrabajoEscritorio: () => null }));

import { MaestroDetalleTrabajos } from "./MaestroDetalleTrabajos";

const trabajo: TrabajoParaMi = {
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
  cantidadPostulaciones: 0,
  yaMePostule: false,
  createdAt: new Date().toISOString(),
  clienteNombre: "Carlos",
  clienteApellidoInicial: "M",
};

describe("MaestroDetalleTrabajos (LAB-45): clic en escritorio", () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
  });

  it("un clic simple selecciona el trabajo sin navegar", () => {
    render(<MaestroDetalleTrabajos trabajos={[trabajo]} />);
    const enlace = screen.getByRole("link", { name: /Olor a gas/ });
    fireEvent.click(enlace);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("con Ctrl o Cmd no intercepta: el navegador abre pestaña nueva", () => {
    render(<MaestroDetalleTrabajos trabajos={[trabajo]} />);
    const enlace = screen.getByRole("link", { name: /Olor a gas/ });
    fireEvent.click(enlace, { ctrlKey: true });
    fireEvent.click(enlace, { metaKey: true });
    expect(push).not.toHaveBeenCalled();
  });

  it("con Shift o Alt tampoco intercepta", () => {
    render(<MaestroDetalleTrabajos trabajos={[trabajo]} />);
    const enlace = screen.getByRole("link", { name: /Olor a gas/ });
    fireEvent.click(enlace, { shiftKey: true });
    fireEvent.click(enlace, { altKey: true });
    expect(push).not.toHaveBeenCalled();
  });

  it("con el botón del medio no intercepta", () => {
    render(<MaestroDetalleTrabajos trabajos={[trabajo]} />);
    const enlace = screen.getByRole("link", { name: /Olor a gas/ });
    fireEvent.click(enlace, { button: 1 });
    expect(push).not.toHaveBeenCalled();
  });
});
