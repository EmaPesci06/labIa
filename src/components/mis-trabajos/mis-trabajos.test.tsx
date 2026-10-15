import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MaestroDetalleMisTrabajos } from "./MaestroDetalleMisTrabajos";
import { PestanasMisTrabajos } from "./PestanasMisTrabajos";
import { SeleccionInicialEscritorio } from "./SeleccionInicialEscritorio";
import { TarjetaMiTrabajo } from "./TarjetaMiTrabajo";
import { TarjetaPostulante } from "./TarjetaPostulante";

vi.mock("server-only", () => ({}));

const reemplazar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: reemplazar, push: vi.fn(), refresh: vi.fn() }),
}));

describe("PestanasMisTrabajos", () => {
  it("son links de navegación: la activa lleva aria-current=page y no usa roles de pestaña", () => {
    render(<PestanasMisTrabajos tabActiva="contratados" />);

    const activa = screen.getByRole("link", { name: "Contratados" });
    expect(activa).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Abiertos" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Terminados" })).toHaveAttribute(
      "href",
      "/mis-trabajos?tab=terminados",
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("se recorre con Tab, sin flechas ni paneles", async () => {
    const user = userEvent.setup();
    render(<PestanasMisTrabajos tabActiva="abiertos" />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Abiertos" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Contratados" })).toHaveFocus();
  });
});

describe("SeleccionInicialEscritorio", () => {
  beforeEach(() => {
    reemplazar.mockClear();
  });

  it("en escritorio agrega el primer trabajo a la URL con replace", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(<SeleccionInicialEscritorio tabActiva="terminados" primerTrabajoId="t-9" />);

    await waitFor(() =>
      expect(reemplazar).toHaveBeenCalledWith("/mis-trabajos?tab=terminados&id=t-9", {
        scroll: false,
      }),
    );
    vi.unstubAllGlobals();
  });

  it("en celular no cambia la URL: no hace falta el detalle", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(<SeleccionInicialEscritorio tabActiva="abiertos" primerTrabajoId="t-9" />);

    expect(reemplazar).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
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

  it("cierra la hoja cuando onElegir devuelve true", async () => {
    const onElegir = vi.fn().mockResolvedValue(true);
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

    await user.click(screen.getByRole("button", { name: "Elegir" }));
    await user.click(screen.getByRole("button", { name: "Elegir profesional" }));

    expect(onElegir).toHaveBeenCalledWith("post-1");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("deja la hoja abierta y muestra el error cuando onElegir devuelve false", async () => {
    const onElegir = vi.fn().mockResolvedValue(false);
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
        errorElegir="El trabajo ya no está abierto."
      />,
    );

    await user.click(screen.getByRole("button", { name: "Elegir" }));
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Elegir profesional" }));
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("El trabajo ya no está abierto.");
  });
});

describe("MaestroDetalleMisTrabajos: lista vacía por pestaña", () => {
  it("cada pestaña vacía muestra su propio texto; el de publicar solo en Abiertos", () => {
    const { unmount } = render(
      <MaestroDetalleMisTrabajos
        trabajos={[]}
        trabajoSeleccionado={null}
        tabActiva="contratados"
      />,
    );
    expect(screen.getByText("Todavía no contrataste a nadie.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no publicaste trabajos.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Publicar un trabajo" })).not.toBeInTheDocument();
    unmount();

    const { unmount: desmontarTerminados } = render(
      <MaestroDetalleMisTrabajos trabajos={[]} trabajoSeleccionado={null} tabActiva="terminados" />,
    );
    expect(screen.getByText("Todavía no tenés trabajos terminados.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Publicar un trabajo" })).not.toBeInTheDocument();
    desmontarTerminados();

    render(
      <MaestroDetalleMisTrabajos trabajos={[]} trabajoSeleccionado={null} tabActiva="abiertos" />,
    );
    expect(screen.getByText("Todavía no publicaste trabajos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publicar un trabajo" })).toBeInTheDocument();
  });
});
