import { beforeEach, describe, expect, it, vi } from "vitest";

import { obtenerPerfil } from "@/lib/perfil/cargar";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import { contactarProfesional } from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/perfil/cargar", () => ({ obtenerPerfil: vi.fn() }));

const PROFESIONAL = "11111111-1111-4111-8111-111111111111";
const TRABAJO = "22222222-2222-4222-8222-222222222222";
const CLIENTE = "33333333-3333-4333-8333-333333333333";
const NUMERO = "5492231234567";

type Resultado = { data: unknown; error: { code?: string } | null };

/** Supabase simulado para la acción de contacto: barrio, título del trabajo y la RPC. */
function preparar(opciones: { rpc?: Resultado; sinTrabajo?: boolean } = {}) {
  const consultas: string[] = [];
  const tablas: Record<string, unknown> = {
    usuarios: { barrio_id: 17 },
    barrios: { nombre: "Centro" },
    trabajos: opciones.sinTrabajo ? null : { titulo: "Destapar desagüe" },
  };
  const constructor = (tabla: string) => {
    const b: Record<string, unknown> = {};
    for (const metodo of ["select", "eq"]) b[metodo] = () => b;
    b.maybeSingle = async () => {
      consultas.push(tabla);
      return { data: tablas[tabla] ?? null, error: null };
    };
    return b;
  };
  const rpcLlamadas: { nombre: string; args: Record<string, unknown> }[] = [];
  const cliente = {
    from: (tabla: string) => constructor(tabla),
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      rpcLlamadas.push({ nombre, args });
      return opciones.rpc ?? { data: NUMERO, error: null };
    },
  };
  vi.mocked(obtenerSesion).mockResolvedValue({
    rol: "cliente",
    usuario: { id: CLIENTE },
  } as never);
  vi.mocked(supabaseConfigurado).mockReturnValue(true);
  vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
  vi.mocked(obtenerPerfil).mockResolvedValue({
    nombre: "Pedro",
    oficios: ["plomeria"],
  } as never);
  return { consultas, rpcLlamadas };
}

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

const estadoInicial = {};

describe("contactarProfesional con origen postulacion (LAB-29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el título del trabajo, lo registra con el origen y abre WhatsApp con el título", async () => {
    const { consultas, rpcLlamadas } = preparar();

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "postulacion", trabajoId: TRABAJO }),
    );

    expect(consultas).toContain("trabajos");
    expect(rpcLlamadas[0]).toEqual({
      nombre: "contactar_profesional",
      args: { p_profesional: PROFESIONAL, p_origen: "postulacion", p_trabajo: TRABAJO },
    });
    expect(r.url).toContain(`wa.me/${NUMERO}`);
    expect(decodeURIComponent(r.url ?? "")).toContain('"Destapar desagüe"');
    expect(r.mensaje).toBeUndefined();
  });

  it("sin trabajo en la postulación no abre el contacto (lo rechaza la validación)", async () => {
    const { rpcLlamadas } = preparar();

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "postulacion" }),
    );

    expect(r.mensaje).toBe("No pudimos abrir el contacto. Volvé a intentar desde el perfil.");
    expect(rpcLlamadas).toHaveLength(0);
  });

  it("si la función rechaza el contacto por un profesional que ya no está, lo dice", async () => {
    preparar({ rpc: { data: null, error: { code: "P0002" } } });

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "postulacion", trabajoId: TRABAJO }),
    );

    expect(r.mensaje).toBe("Ese profesional ya no está disponible.");
    expect(r.url).toBeUndefined();
  });

  it("si el trabajo no se encuentra, el mensaje sigue siendo el de la postulación con 'tu trabajo'", async () => {
    preparar({ sinTrabajo: true });

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "postulacion", trabajoId: TRABAJO }),
    );

    expect(decodeURIComponent(r.url ?? "")).toContain('"tu trabajo"');
  });

  it("desde el perfil no consulta el trabajo ni manda p_trabajo", async () => {
    const { consultas, rpcLlamadas } = preparar();

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "perfil" }),
    );

    expect(consultas).not.toContain("trabajos");
    expect(rpcLlamadas[0]?.args).toEqual({ p_profesional: PROFESIONAL, p_origen: "perfil" });
    expect(decodeURIComponent(r.url ?? "")).toContain("te encontré en LabÍA");
  });

  it("sin sesión no contacta a nadie", async () => {
    preparar();
    vi.mocked(obtenerSesion).mockResolvedValue(null);

    const r = await contactarProfesional(
      estadoInicial,
      formulario({ profesionalId: PROFESIONAL, origen: "postulacion", trabajoId: TRABAJO }),
    );

    expect(r.mensaje).toBe("Tu sesión venció. Ingresá de nuevo para contactar.");
  });
});
