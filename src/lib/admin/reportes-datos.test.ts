import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSesionAdmin, mockCrearClienteServidor } = vi.hoisted(() => ({
  mockSesionAdmin: vi.fn(),
  mockCrearClienteServidor: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/sesion", () => ({ sesionAdmin: mockSesionAdmin }));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: mockCrearClienteServidor,
}));

import { listarReportes, listarResenasBajas } from "./reportes-datos";

beforeEach(() => {
  vi.clearAllMocks();
  mockSesionAdmin.mockResolvedValue(null);
});

describe("lecturas de moderación sin admin (LAB-88)", () => {
  it("listarReportes devuelve una lista vacía sin tocar la base", async () => {
    expect(await listarReportes()).toEqual([]);
    expect(mockCrearClienteServidor).not.toHaveBeenCalled();
  });

  it("listarResenasBajas devuelve una lista vacía sin tocar la base", async () => {
    expect(await listarResenasBajas()).toEqual([]);
    expect(mockCrearClienteServidor).not.toHaveBeenCalled();
  });
});
