import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGuardarResena, mockConsultarElegibilidad } = vi.hoisted(() => ({
  mockGuardarResena: vi.fn(),
  mockConsultarElegibilidad: vi.fn().mockResolvedValue({ puedeResenar: true, resenaPropia: null }),
}));

vi.mock("@/lib/resenas/acciones", () => ({
  guardarResena: mockGuardarResena,
  consultarElegibilidadResena: mockConsultarElegibilidad,
}));

import { HojaResena } from "./HojaResena";

describe("HojaResena", () => {
  const profesionalId = "cccccccc-1200-4000-a000-000000000004";
  const nombreProfesional = "Martín";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el título con el nombre del profesional y los elementos requeridos", () => {
    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
      />,
    );

    expect(screen.getByRole("heading", { name: "¿Cómo te fue con Martín?" })).toBeInTheDocument();

    // Las 5 opciones de calificación con etiquetas accesibles
    expect(screen.getByRole("radio", { name: "Muy mal" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mal" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Regular" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bien" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Excelente" })).toBeInTheDocument();

    // Chips rápidos
    expect(screen.getByRole("button", { name: "Puntual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prolijo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Respetó el presupuesto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explicó bien" })).toBeInTheDocument();

    // Campo de comentario
    expect(
      screen.getByPlaceholderText(
        "Contá cómo fue: puntualidad, prolijidad, si respetó el presupuesto.",
      ),
    ).toBeInTheDocument();

    // Aviso de privacidad
    expect(
      screen.getByText("Tu reseña es pública y aparece con tu nombre y la inicial de tu apellido."),
    ).toBeInTheDocument();

    // Botón de publicar (deshabilitado al inicio porque no hay puntaje)
    expect(screen.getByRole("button", { name: "Publicar reseña" })).toBeDisabled();
  });

  it("permite seleccionar calificación con clic y actualiza la etiqueta visible", async () => {
    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
      />,
    );

    const boton5 = screen.getByRole("radio", { name: "Excelente" });
    await userEvent.click(boton5);

    expect(boton5).toBeChecked();
    expect(screen.getByText("Excelente")).toBeInTheDocument();

    // Ahora el botón de publicar se habilita
    expect(screen.getByRole("button", { name: "Publicar reseña" })).not.toBeDisabled();
  });

  it("permite navegar las estrellas con el teclado", async () => {
    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
      />,
    );

    const radio3 = screen.getByRole("radio", { name: "Regular" });
    await userEvent.click(radio3);
    expect(radio3).toBeChecked();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Bien" })).toBeChecked();

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Regular" })).toBeChecked();
  });

  it("agrega y quita chips rápidos al comentario", async () => {
    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "Contá cómo fue: puntualidad, prolijidad, si respetó el presupuesto.",
    );
    const chipPuntual = screen.getByRole("button", { name: "Puntual" });
    const chipProlijo = screen.getByRole("button", { name: "Prolijo" });

    await userEvent.click(chipPuntual);
    expect(textarea).toHaveValue("Puntual");

    await userEvent.click(chipProlijo);
    expect(textarea).toHaveValue("Puntual. Prolijo");

    // Desmarcar chip puntual
    await userEvent.click(chipPuntual);
    expect(textarea).toHaveValue("Prolijo");
  });

  it("envía la reseña al hacer submit y llama al callback alGuardar", async () => {
    mockGuardarResena.mockResolvedValue({
      ok: true,
      id: "resena-1",
      accion: "creada",
    });

    const alGuardar = vi.fn();
    const onCambioAbierta = vi.fn();

    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={onCambioAbierta}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
        trabajoId="trabajo-123"
        alGuardar={alGuardar}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Excelente" }));
    const textarea = screen.getByPlaceholderText(
      "Contá cómo fue: puntualidad, prolijidad, si respetó el presupuesto.",
    );
    await userEvent.type(textarea, "Excelente trabajo");

    const boton = screen.getByRole("button", { name: "Publicar reseña" });
    await userEvent.click(boton);

    expect(mockGuardarResena).toHaveBeenCalledWith({
      profesionalId,
      puntaje: 5,
      texto: "Excelente trabajo",
      trabajoId: "trabajo-123",
    });

    expect(onCambioAbierta).toHaveBeenCalledWith(false);
    expect(alGuardar).toHaveBeenCalled();
  });

  it("muestra error cuando la acción falla", async () => {
    mockGuardarResena.mockResolvedValue({
      ok: false,
      error: "Solo podés calificar a profesionales que contactaste o contrataste.",
    });

    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Bien" }));
    await userEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));

    expect(
      await screen.findByText(
        "Solo podés calificar a profesionales que contactaste o contrataste.",
      ),
    ).toBeInTheDocument();
  });

  it("inicia en modo edición cuando se provee resenaExistente", () => {
    render(
      <HojaResena
        abierta={true}
        onCambioAbierta={() => {}}
        profesionalId={profesionalId}
        nombreProfesional={nombreProfesional}
        resenaExistente={{
          id: "resena-prev",
          puntaje: 4,
          texto: "Muy buen servicio",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Editar reseña de Martín" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bien" })).toBeChecked();
    expect(
      screen.getByPlaceholderText(
        "Contá cómo fue: puntualidad, prolijidad, si respetó el presupuesto.",
      ),
    ).toHaveValue("Muy buen servicio");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });
});
