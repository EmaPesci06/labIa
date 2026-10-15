import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PestanasMisTrabajos } from "./PestanasMisTrabajos";
import { TarjetaMiTrabajo } from "./TarjetaMiTrabajo";
import { TarjetaPostulante } from "./TarjetaPostulante";

describe("PestanasMisTrabajos", () => {
  it("renderiza las tres pestañas y marca aria-selected en la activa", () => {
    render(<PestanasMisTrabajos tabActiva="abiertos" />);

    const tabAbiertos = screen.getByRole("tab", { name: "Abiertos" });
    const tabContratados = screen.getByRole("tab", { name: "Contratados" });
    const tabTerminados = screen.getByRole("tab", { name: "Terminados" });

    expect(tabAbiertos).toHaveAttribute("aria-selected", "true");
    expect(tabContratados).toHaveAttribute("aria-selected", "false");
    expect(tabTerminados).toHaveAttribute("aria-selected", "false");
  });
});

describe("TarjetaMiTrabajo", () => {
  it("muestra oficio, barrio, estado, título y cantidad de postulantes", () => {
    render(
      <TarjetaMiTrabajo
        trabajo={{
          id: "t-1",
          oficio: "gas",
          titulo: "Olor a gas en la cocina",
          descripcion: "Revisión urgente",
          urgencia: "lo_antes_posible",
          estado: "abierto",
          profesionalElegidoId: null,
          barrioNombre: "La Perla",
          cantidadPostulaciones: 3,
          createdAt: new Date().toISOString(),
        }}
        href="/mis-trabajos/t-1"
      />,
    );

    expect(screen.getByText("Gas · La Perla")).toBeInTheDocument();
    expect(screen.getByText("Abierto")).toBeInTheDocument();
    expect(screen.getByText("Olor a gas en la cocina")).toBeInTheDocument();
    expect(screen.getByText(/3 postulantes/)).toBeInTheDocument();
  });

  it("muestra 'Contratado' cuando el estado es asignado", () => {
    render(
      <TarjetaMiTrabajo
        trabajo={{
          id: "t-2",
          oficio: "plomeria",
          titulo: "Arreglar canilla",
          descripcion: "Pierde agua",
          urgencia: "sin_apuro",
          estado: "asignado",
          profesionalElegidoId: "p-1",
          barrioNombre: "Centro",
          cantidadPostulaciones: 1,
          createdAt: new Date().toISOString(),
        }}
        href="/mis-trabajos/t-2"
      />,
    );

    expect(screen.getByText("Contratado")).toBeInTheDocument();
  });
});

describe("TarjetaPostulante", () => {
  const postulanteBase = {
    id: "post-1",
    profesionalId: "prof-1",
    mensaje: "Puedo ir hoy a las 17 h. Llevo detector de pérdidas.",
    precioEstimado: 40000,
    senaPropuesta: 10000,
    estado: "enviada" as const,
    createdAt: new Date().toISOString(),
    profesional: {
      nombre: "Martín",
      apellidoInicial: "G",
      fotoPath: null,
      especialidades: null,
      promedio: 4.9,
      cantidadResenas: 12,
      matriculado: true,
      oficios: ["gas" as const],
      distanciaKm: 1.2,
    },
  };

  it("renderiza datos del profesional, presupuesto, seña y botón Elegir", () => {
    render(
      <TarjetaPostulante
        postulante={postulanteBase}
        trabajoId="t-1"
        trabajoEstado="abierto"
        esElegido={false}
        hayElegido={false}
        onElegir={vi.fn()}
        pendiente={false}
      />,
    );

    expect(screen.getByText("Martín G.")).toBeInTheDocument();
    expect(screen.getByText(/Gas matriculado · 4,9 estrellas/)).toBeInTheDocument();
    expect(screen.getByText(/Presupuesto estimado \$ 40\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Seña \$ 10\.000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir" })).toBeInTheDocument();
  });

  it("muestra 'Elegido' si es el seleccionado", () => {
    render(
      <TarjetaPostulante
        postulante={postulanteBase}
        trabajoId="t-1"
        trabajoEstado="asignado"
        esElegido={true}
        hayElegido={true}
        onElegir={vi.fn()}
        pendiente={false}
      />,
    );

    expect(screen.getByText("Elegido")).toBeInTheDocument();
  });

  it("muestra modal de confirmación al hacer clic en Elegir", async () => {
    const onElegir = vi.fn();
    const user = userEvent.setup();

    render(
      <TarjetaPostulante
        postulante={postulanteBase}
        trabajoId="t-1"
        trabajoEstado="abierto"
        esElegido={false}
        hayElegido={false}
        onElegir={onElegir}
        pendiente={false}
      />,
    );

    const botonElegir = screen.getByRole("button", { name: "Elegir" });
    await user.click(botonElegir);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("¿Elegís a Martín?")).toBeInTheDocument();
  });
});
