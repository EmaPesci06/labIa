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

// LAB-52: al cerrar un trabajo, las fotos se quitan con la service role (desde /admin).
const { mockFotosDelTrabajo, mockRemoveFotos } = vi.hoisted(() => ({
  mockFotosDelTrabajo: vi.fn().mockResolvedValue({ data: { fotos: [] }, error: null }),
  mockRemoveFotos: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  crearClienteAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockFotosDelTrabajo }) }) }),
    storage: { from: () => ({ remove: mockRemoveFotos }) },
  }),
}));

vi.mock("@/lib/trabajos/fotos-firmadas", () => ({ BUCKET_FOTOS_TRABAJOS: "fotos-trabajos" }));

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

    it("quita del bucket privado las fotos del trabajo cerrado", async () => {
      const ruta = `${UUID_1}/${UUID_1}/0-1.jpg`;
      mockFotosDelTrabajo.mockResolvedValueOnce({ data: { fotos: [ruta] }, error: null });

      const res = await cerrarTrabajoAccion(UUID_1, "Contenido inapropiado");

      expect(res.ok).toBe(true);
      expect(mockRemoveFotos).toHaveBeenCalledWith([ruta]);
    });

    it("sin fotos no toca Storage", async () => {
      mockFotosDelTrabajo.mockResolvedValueOnce({ data: { fotos: [] }, error: null });

      await cerrarTrabajoAccion(UUID_1);

      expect(mockRemoveFotos).not.toHaveBeenCalled();
    });
  });
});
