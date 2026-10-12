import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PerfilPublico } from "@/lib/perfil/cargar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock("@/lib/perfil/acciones", () => ({ cargarMasResenas: vi.fn() }));

import { PerfilProfesional } from "./PerfilProfesional";

const perfil: PerfilPublico = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Martín G.",
  nombreCompleto: false,
  fotoUrl: null,
  barrioId: 51,
  oficios: ["gas", "plomeria"],
  especialidades: "Pérdidas de gas, Calefactores",
  descripcion: "Gasista matriculado.",
  aniosExperiencia: 12,
  zonasTexto: "La Perla, Centro",
  disponibilidad: "Lun a sáb, 8 a 18 h",
  fotosTrabajos: [],
  identidadVerificada: true,
  antecedentesOk: true,
  matriculado: true,
  publicado: true,
  promedio: 4.9,
  cantidadResenas: 23,
  esPropio: false,
};

const resenas = {
  total: 23,
  resenas: [
    { id: "r1", autor: "Laura F.", puntaje: 5, texto: "Vino en el día.", cuando: "hace 2 días" },
  ],
};

describe("PerfilProfesional", () => {
  it("muestra nombre con inicial, línea de oficio, puntaje y reseñas", () => {
    render(<PerfilProfesional perfil={perfil} resenas={resenas} distanciaKm={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Martín G." })).toBeInTheDocument();
    expect(screen.getByText(/Gasista · 12 años de experiencia/)).toBeInTheDocument();
    expect(screen.getByText("Laura F. · 5 estrellas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver todas (23)" })).toBeInTheDocument();
    expect(screen.queryByText(/de vos/)).not.toBeInTheDocument();
  });

  it("muestra la distancia solo cuando la hay", () => {
    render(<PerfilProfesional perfil={perfil} resenas={resenas} distanciaKm={1.2} />);
    expect(screen.getAllByText("a 1,2 km de vos").length).toBeGreaterThan(0);
  });

  it("sin reseñas dice que todavía no tiene", () => {
    render(
      <PerfilProfesional
        perfil={{ ...perfil, promedio: null, cantidadResenas: 0 }}
        resenas={{ total: 0, resenas: [] }}
        distanciaKm={null}
      />,
    );
    expect(screen.getByText("Todavía no tiene reseñas.")).toBeInTheDocument();
  });

  it("ofrece contactar a un tercero y nunca muestra teléfonos ni emails", () => {
    const { container } = render(
      <PerfilProfesional perfil={perfil} resenas={resenas} distanciaKm={null} />,
    );
    expect(
      screen.getAllByRole("button", { name: /Contactar por WhatsApp/ }).length,
    ).toBeGreaterThan(0);
    expect(container.innerHTML).not.toMatch(/\+549|wa\.me|@/);
  });

  it("al dueño le muestra el banner y Editar perfil, sin WhatsApp", () => {
    render(
      <PerfilProfesional
        perfil={{ ...perfil, esPropio: true, publicado: false }}
        resenas={resenas}
        distanciaKm={null}
      />,
    );
    expect(
      screen.getByText("Tu perfil está en revisión: todavía no aparece en búsquedas."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Editar perfil" })[0]).toHaveAttribute(
      "href",
      "/cuenta/perfil",
    );
    expect(screen.queryByRole("button", { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it("dueño con perfil publicado ve el banner de publicado", () => {
    render(
      <PerfilProfesional
        perfil={{ ...perfil, esPropio: true }}
        resenas={resenas}
        distanciaKm={null}
      />,
    );
    expect(screen.getByText("Tu perfil está publicado.")).toBeInTheDocument();
  });
});
