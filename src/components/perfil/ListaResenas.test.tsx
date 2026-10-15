import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResenaPerfil } from "@/lib/perfil/cargar";

vi.mock("@/lib/perfil/acciones", () => ({ cargarMasResenas: vi.fn() }));

import { cargarMasResenas } from "@/lib/perfil/acciones";

import { ListaResenas } from "./ListaResenas";

const PROFESIONAL = "11111111-1111-4111-8111-111111111111";

const resena = (n: number): ResenaPerfil => ({
  id: `r${n}`,
  autor: `Cliente ${n}`,
  puntaje: 5,
  texto: `Texto ${n}`,
  cuando: "hace 1 día",
});

describe("ListaResenas", () => {
  it("muestra una reseña nueva cuando llegan props nuevas (router.refresh)", () => {
    const { rerender } = render(
      <ListaResenas profesionalId={PROFESIONAL} iniciales={[resena(1)]} total={1} />,
    );
    expect(screen.queryByText("Texto 2")).not.toBeInTheDocument();

    rerender(
      <ListaResenas profesionalId={PROFESIONAL} iniciales={[resena(2), resena(1)]} total={2} />,
    );
    expect(screen.getByText("Texto 2")).toBeInTheDocument();
    expect(screen.getByText("Texto 1")).toBeInTheDocument();
  });

  it("conserva la paginación 'Ver más' al cambiar las props", async () => {
    vi.mocked(cargarMasResenas).mockResolvedValue({ ok: true, resenas: [resena(3)], total: 4 });
    const { rerender } = render(
      <ListaResenas profesionalId={PROFESIONAL} iniciales={[resena(1), resena(2)]} total={3} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ver todas (3)" }));
    await waitFor(() => expect(screen.getByText("Texto 3")).toBeInTheDocument());

    rerender(
      <ListaResenas
        profesionalId={PROFESIONAL}
        iniciales={[resena(4), resena(1), resena(2)]}
        total={4}
      />,
    );
    expect(screen.getByText("Texto 4")).toBeInTheDocument();
    expect(screen.getByText("Texto 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver/ })).not.toBeInTheDocument();
  });
});
