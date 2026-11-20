import { beforeEach, describe, expect, it, vi } from "vitest";

import { VERSION_LEGALES } from "@/lib/legales";
import { rolDeLaSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { completarRegistroCliente, registrarCliente } from "./registro-cliente";

const { redirigir } = vi.hoisted(() => ({
  redirigir: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: redirigir }));
vi.mock("@/lib/metricas-servidor", () => ({ registrarEventoServidor: vi.fn() }));
vi.mock("@/lib/sesion", () => ({ rolDeLaSesion: vi.fn(async () => "cliente") }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/rate-limit-persistente", () => ({
  limitarPorIp: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  limitarPersistente: vi.fn(async () => ({ permitido: true, segundosParaReintentar: 0 })),
  mensajeDeLimite: () => null,
}));

const EMAIL = "carla@ejemplo.com";

function datosValidos(): FormData {
  const datos = new FormData();
  datos.set("nombreCompleto", "Carla Gómez");
  datos.set("whatsapp", "2235550123");
  datos.set("email", EMAIL);
  datos.set("contrasena", "unaclave123");
  datos.set("mayorEdad", "on");
  datos.set("barrio", "17");
  return datos;
}

describe("registrarCliente (LAB-76)", () => {
  let getUser: ReturnType<typeof vi.fn>;
  let signUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getUser = vi.fn(async () => ({ data: { user: null } }));
    signUp = vi.fn(async () => ({
      data: { user: { id: "u-1", identities: [{ id: "id-1" }] }, session: null },
      error: null,
    }));
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
    vi.mocked(rolDeLaSesion).mockResolvedValue("cliente");
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { getUser, signUp },
    } as never);
  });

  it("alta nueva con confirmación de email devuelve confirmarEmail", async () => {
    const estado = await registrarCliente({}, datosValidos());
    expect(estado).toEqual({ confirmarEmail: EMAIL, valores: { email: EMAIL } });
  });

  it("email existente devuelve exactamente la misma respuesta que un alta nueva (sin enumerar)", async () => {
    const esperado = { confirmarEmail: EMAIL, valores: { email: EMAIL } };

    signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422 },
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);

    signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "email_exists", status: 400 },
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);

    signUp.mockResolvedValueOnce({
      data: { user: { id: "u-dup", identities: [] }, session: null },
      error: null,
    });
    expect(await registrarCliente({}, datosValidos())).toEqual(esperado);
  });

  it("manda la versión de los términos en la metadata para que el trigger del alta la registre (LAB-81)", async () => {
    await registrarCliente({}, datosValidos());
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ rol: "cliente", terminos_version: VERSION_LEGALES }),
        }),
      }),
    );
  });

  it("con sesión inmediata graba el consentimiento y los datos antes de entrar a /inicio", async () => {
    const llamadas: string[] = [];
    const rpc = vi.fn(async (nombre: string) => {
      llamadas.push(nombre);
      return { error: null };
    });
    signUp.mockResolvedValueOnce({
      data: { user: { id: "u-1", identities: [{ id: "id-1" }] }, session: { access_token: "t" } },
      error: null,
    });
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { getUser, signUp },
      rpc,
      from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
    } as never);

    await expect(registrarCliente({}, datosValidos())).rejects.toThrow("NEXT_REDIRECT:/inicio");
    expect(rpc).toHaveBeenCalledWith("aceptar_terminos", { p_version: VERSION_LEGALES });
    expect(llamadas).toContain("actualizar_whatsapp");
  });

  it("si no se puede grabar el consentimiento, la cuenta sigue en /registro/cliente/completar", async () => {
    signUp.mockResolvedValueOnce({
      data: { user: { id: "u-1", identities: [{ id: "id-1" }] }, session: { access_token: "t" } },
      error: null,
    });
    vi.mocked(crearClienteServidor).mockResolvedValue({
      auth: { getUser, signUp },
      rpc: async (nombre: string) => ({
        error: nombre === "aceptar_terminos" ? { code: "X" } : null,
      }),
      from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
    } as never);

    await expect(registrarCliente({}, datosValidos())).rejects.toThrow(
      "NEXT_REDIRECT:/registro/cliente/completar?aviso=datos",
    );
  });

  it("sin la casilla de términos no crea la cuenta y devuelve el error en el campo", async () => {
    const datos = datosValidos();
    datos.delete("mayorEdad");
    const estado = await registrarCliente({}, datos);
    expect(estado.errores?.mayorEdad).toMatch(/mayor de 18/);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("si ya hay sesión activa, redirige al inicio del rol y no llama a signUp", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-activo" } } });
    vi.mocked(rolDeLaSesion).mockResolvedValueOnce("profesional");

    await expect(registrarCliente({}, datosValidos())).rejects.toThrow("NEXT_REDIRECT:/trabajos");
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("completarRegistroCliente (alta con Google)", () => {
  const datos = (conCasilla: boolean) => {
    const d = new FormData();
    d.set("whatsapp", "2235550123");
    d.set("barrio", "17");
    if (conCasilla) d.set("mayorEdad", "on");
    return d;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseConfigurado).mockReturnValue(true);
  });

  it("sin la casilla devuelve el error y no toca la base ni la sesión", async () => {
    const estado = await completarRegistroCliente({}, datos(false));
    expect(estado.errores?.mayorEdad).toMatch(/mayor de 18/);
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });

  it("con la casilla sigue adelante (llega a consultar la sesión)", async () => {
    const getUser = vi.fn(async () => ({ data: { user: null } }));
    vi.mocked(crearClienteServidor).mockResolvedValue({ auth: { getUser } } as never);
    await expect(completarRegistroCliente({}, datos(true))).rejects.toThrow("NEXT_REDIRECT");
    expect(getUser).toHaveBeenCalled();
  });

  describe("con la casilla y una sesión de cliente (LAB-81)", () => {
    function clienteConSesion(rpcFalla?: string) {
      const llamadas: { nombre: string; args: unknown }[] = [];
      const cliente = {
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u-g" } } })) },
        rpc: vi.fn(async (nombre: string, args: unknown) => {
          llamadas.push({ nombre, args });
          return { error: nombre === rpcFalla ? { code: "42501" } : null };
        }),
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { rol: "cliente", estado: "activa" } }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
      };
      vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
      return llamadas;
    }

    it("graba el consentimiento en el servidor, primero, y entra a /inicio", async () => {
      const llamadas = clienteConSesion();
      await expect(completarRegistroCliente({}, datos(true))).rejects.toThrow(
        "NEXT_REDIRECT:/inicio",
      );
      expect(llamadas[0]).toEqual({
        nombre: "aceptar_terminos",
        args: { p_version: VERSION_LEGALES },
      });
      expect(llamadas.map((l) => l.nombre)).toContain("actualizar_whatsapp");
    });

    it("si el servidor no graba el consentimiento, no guarda nada más ni deja pasar", async () => {
      const llamadas = clienteConSesion("aceptar_terminos");
      const estado = await completarRegistroCliente({}, datos(true));
      expect(estado.mensaje).toMatch(/No pudimos completar el registro/);
      expect(llamadas.map((l) => l.nombre)).toEqual(["aceptar_terminos"]);
    });
  });
});
