import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/sesion", () => ({
  sesionAdmin: vi.fn(),
}));

vi.mock("@/lib/admin/sesiones", () => ({
  revocarSesionesUsuario: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/emails/avisos", () => ({
  avisarCuentaSuspendida: vi.fn().mockResolvedValue(undefined),
}));

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn().mockResolvedValue({
    rpc: mockRpc,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));

// LAB-52: al cerrar un trabajo, las fotos se quitan con la service role (desde /admin).
const { mockTrabajoDelCierre, mockListFotos, mockRemoveFotos } = vi.hoisted(() => ({
  mockTrabajoDelCierre: vi.fn().mockResolvedValue({ data: { cliente_id: "c-1" }, error: null }),
  mockListFotos: vi.fn().mockResolvedValue({ data: [], error: null }),
  mockRemoveFotos: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  crearClienteAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockTrabajoDelCierre }) }) }),
    storage: { from: () => ({ list: mockListFotos, remove: mockRemoveFotos }) },
  }),
}));

import { sesionAdmin } from "@/lib/admin/sesion";
import { revocarSesionesUsuario } from "@/lib/admin/sesiones";
import { avisarCuentaSuspendida } from "@/lib/emails/avisos";
import {
  cerrarTrabajoAccion,
  marcarEnRevisionAccion,
  ocultarResenaAccion,
  reactivarCuentaAccion,
  resolverReporteAccion,
  suspenderCuentaAccion,
} from "./reportes-acciones";

const UUID_1 = "11111111-1111-4111-8111-111111111111";

describe("reportes-acciones (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("control de acceso de administrador", () => {
    it("rechaza todas las acciones si no hay sesión de admin", async () => {
      vi.mocked(sesionAdmin).mockResolvedValue(null);

      expect(await marcarEnRevisionAccion(UUID_1)).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });

      expect(await resolverReporteAccion(UUID_1, "accion_tomada")).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });

      expect(await ocultarResenaAccion(UUID_1)).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });

      expect(await cerrarTrabajoAccion(UUID_1)).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });

      expect(await suspenderCuentaAccion(UUID_1, "Motivo")).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });

      expect(await reactivarCuentaAccion(UUID_1)).toEqual({
        ok: false,
        error: "Solo un administrador puede realizar esta acción.",
      });
    });
  });

  describe("suspenderCuentaAccion", () => {
    beforeEach(() => {
      vi.mocked(sesionAdmin).mockResolvedValue({
        usuario: { id: "admin-1", email: "admin@labia.ar" },
        rol: "admin",
        normasVersion: "1.0",
        perfil: {
          nombre: "Admin",
          apellido: null,
          nombreVisible: "Admin",
          completo: true,
        },
      });
    });

    it("rechaza motivo menor a 3 caracteres", async () => {
      const res = await suspenderCuentaAccion(UUID_1, "ab");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("El motivo debe tener al menos 3 caracteres.");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("llama a suspender_cuenta_admin y notifica por email", async () => {
      mockRpc.mockResolvedValue({ error: null });

      const res = await suspenderCuentaAccion(UUID_1, "Incumplimiento grave");
      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("suspender_cuenta_admin", {
        p_usuario_id: UUID_1,
        p_motivo: "Incumplimiento grave",
      });
      expect(revocarSesionesUsuario).toHaveBeenCalledWith(UUID_1);
      expect(avisarCuentaSuspendida).toHaveBeenCalledWith(UUID_1, "Incumplimiento grave");
    });

    it("si no se pueden cerrar las sesiones, no informa éxito ni manda el aviso", async () => {
      mockRpc.mockResolvedValue({ error: null });
      vi.mocked(revocarSesionesUsuario).mockResolvedValueOnce(false);

      const res = await suspenderCuentaAccion(UUID_1, "Incumplimiento grave");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("no pudimos cerrar sus sesiones");
      expect(avisarCuentaSuspendida).not.toHaveBeenCalled();
    });
  });

  describe("resolverReporteAccion", () => {
    beforeEach(() => {
      vi.mocked(sesionAdmin).mockResolvedValue({
        usuario: { id: "admin-1", email: "admin@labia.ar" },
        rol: "admin",
        normasVersion: "1.0",
        perfil: {
          nombre: "Admin",
          apellido: null,
          nombreVisible: "Admin",
          completo: true,
        },
      });
    });

    it("llama a resolver_reporte con acción tomada", async () => {
      mockRpc.mockResolvedValue({ error: null });

      const res = await resolverReporteAccion(UUID_1, "accion_tomada", "Se ocultó contenido");
      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("resolver_reporte", {
        p_reporte_id: UUID_1,
        p_con_accion: true,
        p_motivo: "Se ocultó contenido",
      });
    });

    it("llama a resolver_reporte desestimado", async () => {
      mockRpc.mockResolvedValue({ error: null });

      const res = await resolverReporteAccion(UUID_1, "desestimado");
      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("resolver_reporte", {
        p_reporte_id: UUID_1,
        p_con_accion: false,
        p_motivo: undefined,
      });
    });
  });

  describe("marcarEnRevisionAccion", () => {
    it("llama a marcar_reporte_en_revision", async () => {
      vi.mocked(sesionAdmin).mockResolvedValue({
        usuario: { id: "admin-1", email: "admin@labia.ar" },
        rol: "admin",
        normasVersion: "1.0",
        perfil: {
          nombre: "Admin",
          apellido: null,
          nombreVisible: "Admin",
          completo: true,
        },
      });
      mockRpc.mockResolvedValue({ error: null });

      const res = await marcarEnRevisionAccion(UUID_1);
      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("marcar_reporte_en_revision", {
        p_reporte_id: UUID_1,
      });
    });
  });

  describe("cerrarTrabajoAccion y las fotos del trabajo (LAB-52)", () => {
    beforeEach(() => {
      vi.mocked(sesionAdmin).mockResolvedValue({
        usuario: { id: "admin-1", email: "admin@labia.ar" },
        rol: "admin",
        normasVersion: "1.0",
        perfil: { nombre: "Admin", apellido: null, nombreVisible: "Admin", completo: true },
      } as Awaited<ReturnType<typeof sesionAdmin>>);
      mockRpc.mockResolvedValue({ error: null });
    });

    it("quita toda la carpeta del trabajo del bucket privado, listando lo que hay", async () => {
      mockTrabajoDelCierre.mockResolvedValueOnce({ data: { cliente_id: "c-1" }, error: null });
      mockListFotos.mockResolvedValueOnce({
        data: [
          { id: "a", name: "0-1.jpg" },
          { id: "b", name: "1-2.jpg" },
        ],
        error: null,
      });

      const res = await cerrarTrabajoAccion(UUID_1, "Contenido inapropiado");

      expect(res.ok).toBe(true);
      expect(mockListFotos).toHaveBeenCalledWith(`c-1/${UUID_1}`, { limit: 100, offset: 0 });
      expect(mockRemoveFotos).toHaveBeenCalledWith([
        `c-1/${UUID_1}/0-1.jpg`,
        `c-1/${UUID_1}/1-2.jpg`,
      ]);
    });

    it("sin fotos en la carpeta no toca Storage", async () => {
      mockListFotos.mockResolvedValueOnce({ data: [], error: null });

      await cerrarTrabajoAccion(UUID_1);

      expect(mockRemoveFotos).not.toHaveBeenCalled();
    });
  });
});
