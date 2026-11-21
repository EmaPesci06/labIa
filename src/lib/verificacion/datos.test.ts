import { beforeEach, describe, expect, it, vi } from "vitest";

// LAB-88: las lecturas del panel admin comprueban al admin ellas mismas (el layout de /admin no se
// vuelve a renderizar al navegar por RSC y estas funciones leen con la service role).
const { mockSesionAdmin, mockCrearClienteAdmin, mockCrearClienteServidor } = vi.hoisted(() => ({
  mockSesionAdmin: vi.fn(),
  mockCrearClienteAdmin: vi.fn(),
  mockCrearClienteServidor: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/sesion", () => ({ sesionAdmin: mockSesionAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ crearClienteAdmin: mockCrearClienteAdmin }));
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: mockCrearClienteServidor,
}));

import { listarProfesionales, obtenerDetalleProfesional } from "./datos";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mockSesionAdmin.mockResolvedValue(null);
});

describe("lecturas del panel admin sin admin", () => {
  it("obtenerDetalleProfesional devuelve null sin tocar la base ni la service role", async () => {
    expect(await obtenerDetalleProfesional(ID)).toBeNull();
    expect(mockCrearClienteAdmin).not.toHaveBeenCalled();
    expect(mockCrearClienteServidor).not.toHaveBeenCalled();
  });

  it("listarProfesionales devuelve una lista vacía sin tocar la base", async () => {
    expect(await listarProfesionales()).toEqual([]);
    expect(mockCrearClienteServidor).not.toHaveBeenCalled();
  });
});
