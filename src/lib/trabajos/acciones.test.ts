import { beforeEach, describe, expect, it, vi } from "vitest";

import { MENSAJE_CONTACTO_POSTULACION, MENSAJE_SENA_MAYOR } from "@/lib/validaciones/postulacion";
import { avisarEleccion, avisarNuevaPostulacion } from "@/lib/emails/avisos";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import {
  cancelarTrabajo,
  elegirPostulante,
  marcarTrabajoTerminado,
  postularme,
  publicarTrabajo,
} from "./acciones";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("@/lib/auth/sesion-falsa", () => ({ rolFalso: vi.fn(() => null) }));
vi.mock("@/lib/supabase/servidor", () => ({
  crearClienteServidor: vi.fn(),
  supabaseConfigurado: vi.fn(() => true),
}));
vi.mock("@/lib/metricas-servidor", () => ({ registrarEventoServidor: vi.fn() }));
vi.mock("@/lib/emails/avisos", () => ({
  avisarNuevaPostulacion: vi.fn(async () => undefined),
  avisarEleccion: vi.fn(async () => undefined),
}));

// Límite persistente (LAB-47): por defecto se comporta como la memoria, así los casos de siempre no cambian.
vi.mock("@/lib/rate-limit-persistente", async () => {
  const { limitarIntentos } = await import("@/lib/rate-limit");
  return {
    limitarPersistente: vi.fn(async (clave: string, regla: { maximo: number; ventanaMs: number }) =>
      limitarIntentos(clave, regla),
    ),
  };
});

const TRABAJO = "11111111-1111-4111-8111-111111111111";
const POSTULACION = "22222222-2222-4222-8222-222222222222";
const PROFESIONAL = "33333333-3333-4333-8333-333333333333";
const CLIENTE = "44444444-4444-4444-8444-444444444444";
const MENSAJE_OK = "Puedo pasar hoy por la tarde y lo resuelvo.";

type Resultado = { data: unknown; error: { code?: string; message?: string } | null };

type Config = {
  perfil?: { publicado: boolean; oficios: string[] } | null;
  trabajo?: { id: string; oficio: string; estado: string } | null;
  /** Archivos que hay en la carpeta `<cliente>/<trabajo>/` del bucket `fotos-trabajos`. */
  archivosDelTrabajo?: string[];
  previa?: { id: string; estado: string } | null;
  insertar?: Resultado;
  rpc?: Record<string, Resultado>;
  sinConexion?: boolean;
};

/** Cliente de Supabase simulado: responde las consultas de `postularme` y registra lo que se llamó. */
function crearSupabase(config: Config = {}) {
  const llamadas: { tabla?: string; metodo: string; args: unknown[] }[] = [];

  const resultadoDe = (tabla: string): Resultado => {
    if (tabla === "perfiles_profesionales") return { data: config.perfil ?? null, error: null };
    if (tabla === "trabajos") return { data: config.trabajo ?? null, error: null };
    if (tabla === "postulaciones") return { data: config.previa ?? null, error: null };
    return { data: null, error: null };
  };

  const constructor = (tabla: string) => {
    const b: Record<string, unknown> = {};
    for (const metodo of ["select", "eq", "is", "not", "lte", "in", "update"]) {
      b[metodo] = (...args: unknown[]) => {
        llamadas.push({ tabla, metodo, args });
        return b;
      };
    }
    b.maybeSingle = async () => resultadoDe(tabla);
    b.insert = (valores: unknown) => {
      llamadas.push({ tabla, metodo: "insert", args: [valores] });
      return {
        select: () => ({
          single: async () => config.insertar ?? { data: { id: POSTULACION }, error: null },
        }),
      };
    };
    return b;
  };

  const cliente = {
    from: (tabla: string) => constructor(tabla),
    rpc: async (nombre: string, args: unknown) => {
      llamadas.push({ metodo: "rpc", args: [nombre, args] });
      return config.rpc?.[nombre] ?? { data: null, error: null };
    },
    // LAB-52: las fotos de un trabajo se quitan con storage.remove (la policy de delete del dueño).
    storage: {
      from: (bucket: string) => ({
        list: async () => ({
          data: (config.archivosDelTrabajo ?? []).map((name) => ({ id: "f", name })),
          error: null,
        }),
        remove: async (rutas: string[]) => {
          llamadas.push({ tabla: `storage:${bucket}`, metodo: "remove", args: [rutas] });
          return { data: rutas, error: null };
        },
      }),
    },
  };

  return { cliente, llamadas };
}

function datosPostulacion(campos: Record<string, string> = {}): FormData {
  const datos = new FormData();
  const base = { mensaje: MENSAJE_OK, precioEstimado: "15000", senaPropuesta: "3000", ...campos };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

const sesionProfesional = (id = PROFESIONAL) => ({
  rol: "profesional",
  usuario: { id },
});

const perfilOk = { publicado: true, oficios: ["plomeria"] };
const trabajoOk = { id: TRABAJO, oficio: "plomeria", estado: "abierto" };

function preparar(config: Config, sesion: unknown = sesionProfesional()) {
  const { cliente, llamadas } = crearSupabase(config);
  vi.mocked(obtenerSesion).mockResolvedValue(sesion as never);
  vi.mocked(supabaseConfigurado).mockReturnValue(!config.sinConexion);
  vi.mocked(crearClienteServidor).mockResolvedValue(cliente as never);
  return { llamadas };
}

describe("postularme (LAB-28, bloqueante)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin sesión pide ingresar de nuevo", async () => {
    preparar({ perfil: perfilOk, trabajo: trabajoOk }, null);
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Tu sesión venció. Ingresá de nuevo para postularte.");
  });

  it("un cliente no se puede postular", async () => {
    preparar(
      { perfil: perfilOk, trabajo: trabajoOk },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Solo las cuentas de profesional pueden postularse a trabajos.");
  });

  it("rechaza un identificador de trabajo que no es UUID", async () => {
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme("no-es-un-uuid", {}, datosPostulacion());
    expect(r.mensaje).toBe("Identificador de trabajo inválido.");
  });

  it("valida el mensaje: menos de 20 caracteres", async () => {
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(TRABAJO, {}, datosPostulacion({ mensaje: "Hola" }));
    expect(r.errores?.mensaje).toBe("Escribí al menos 20 caracteres.");
  });

  it("no deja pasar teléfonos en el mensaje", async () => {
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(
      TRABAJO,
      {},
      datosPostulacion({ mensaje: "Llamame al 2231234567 que lo resolvemos." }),
    );
    expect(r.errores?.mensaje).toBe(MENSAJE_CONTACTO_POSTULACION);
  });

  it("la seña no puede superar el precio estimado", async () => {
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(
      TRABAJO,
      {},
      datosPostulacion({ precioEstimado: "1000", senaPropuesta: "5000" }),
    );
    expect(r.errores?.senaPropuesta).toBe(MENSAJE_SENA_MAYOR);
  });

  it("con el perfil sin publicar (en revisión) no se postula", async () => {
    const { llamadas } = preparar({
      perfil: { publicado: false, oficios: ["plomeria"] },
      trabajo: trabajoOk,
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Vas a poder postularte cuando aprobemos tus documentos.");
    expect(llamadas.some((l) => l.metodo === "insert")).toBe(false);
  });

  it("un trabajo que ya no está abierto no recibe postulaciones", async () => {
    preparar({ perfil: perfilOk, trabajo: { ...trabajoOk, estado: "asignado" } });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Este trabajo ya no recibe postulaciones.");
  });

  it("solo se postula a trabajos de sus oficios", async () => {
    preparar({ perfil: perfilOk, trabajo: { ...trabajoOk, oficio: "gas" } });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Solo podés postularte a trabajos de tus oficios.");
  });

  it("si ya tiene una postulación activa, no crea otra", async () => {
    const { llamadas } = preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      previa: { id: POSTULACION, estado: "enviada" },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Ya te postulaste a este trabajo.");
    expect(llamadas.some((l) => l.metodo === "insert")).toBe(false);
  });

  it("una postulación descartada tampoco se vuelve a enviar", async () => {
    preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      previa: { id: POSTULACION, estado: "descartada" },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Ya te postulaste a este trabajo.");
  });

  it("una postulación retirada se reactiva (no se rechaza) con la RPC", async () => {
    const { llamadas } = preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      previa: { id: POSTULACION, estado: "retirada" },
      rpc: { reactivar_postulacion: { data: POSTULACION, error: null } },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r).toEqual({ ok: true, postulacionId: POSTULACION });
    const rpc = llamadas.find((l) => l.metodo === "rpc");
    expect(rpc?.args[0]).toBe("reactivar_postulacion");
    expect(rpc?.args[1]).toEqual({
      p_trabajo_id: TRABAJO,
      p_mensaje: MENSAJE_OK,
      p_precio_estimado: 15000,
      p_sena_propuesta: 3000,
    });
    expect(llamadas.some((l) => l.metodo === "insert")).toBe(false);
    expect(avisarNuevaPostulacion).toHaveBeenCalledWith(POSTULACION);
  });

  it("si el trabajo se cerró mientras tanto, la reactivación se rechaza con el mensaje de trabajo cerrado", async () => {
    preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      previa: { id: POSTULACION, estado: "retirada" },
      rpc: { reactivar_postulacion: { data: null, error: { code: "22023" } } },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Este trabajo ya no recibe postulaciones.");
  });

  it("aplica el límite de 30 postulaciones por día", async () => {
    const usuario = "55555555-5555-4555-8555-555555555555";
    for (let i = 0; i < 30; i++) {
      preparar({ perfil: perfilOk, trabajo: trabajoOk }, sesionProfesional(usuario));
      const r = await postularme(TRABAJO, {}, datosPostulacion());
      expect(r.ok).toBe(true);
    }
    const { llamadas } = preparar(
      { perfil: perfilOk, trabajo: trabajoOk },
      sesionProfesional(usuario),
    );
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Alcanzaste el límite de 30 postulaciones por día. Intentá mañana.");
    expect(llamadas.some((l) => l.metodo === "insert")).toBe(false);
  });

  it("sin conexión con Supabase responde con un mensaje, sin escribir", async () => {
    preparar({ sinConexion: true });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("No pudimos conectar con el servidor.");
  });

  it("una postulación nueva se inserta, registra la métrica y avisa al cliente", async () => {
    const { llamadas } = preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r).toEqual({ ok: true, postulacionId: POSTULACION });
    const insert = llamadas.find((l) => l.metodo === "insert");
    expect(insert?.args[0]).toMatchObject({
      trabajo_id: TRABAJO,
      profesional_id: PROFESIONAL,
      estado: "enviada",
      precio_estimado: 15000,
      sena_propuesta: 3000,
    });
    expect(registrarEventoServidor).toHaveBeenCalledWith(PROFESIONAL, "postulacion_enviada", {
      oficio: "plomeria",
    });
    expect(avisarNuevaPostulacion).toHaveBeenCalledWith(POSTULACION);
  });

  it("si falla el email, la postulación sigue siendo un éxito", async () => {
    vi.mocked(avisarNuevaPostulacion).mockRejectedValueOnce(new Error("Resend caído"));
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r).toEqual({ ok: true, postulacionId: POSTULACION });
  });

  it("si falla la métrica, la postulación sigue siendo un éxito", async () => {
    vi.mocked(registrarEventoServidor).mockRejectedValueOnce(new Error("PostHog caído"));
    preparar({ perfil: perfilOk, trabajo: trabajoOk });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r).toEqual({ ok: true, postulacionId: POSTULACION });
  });

  it("una carrera con otra postulación (23505) se informa como ya postulado", async () => {
    preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      insertar: { data: null, error: { code: "23505" } },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("Ya te postulaste a este trabajo.");
  });

  it("otro error al insertar responde el mensaje general", async () => {
    preparar({
      perfil: perfilOk,
      trabajo: trabajoOk,
      insertar: { data: null, error: { code: "XX000" } },
    });
    const r = await postularme(TRABAJO, {}, datosPostulacion());
    expect(r.mensaje).toBe("No pudimos enviar tu postulación. Probá de nuevo en unos minutos.");
  });
});

describe("elegirPostulante (LAB-29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("solo el cliente puede elegir", async () => {
    preparar({}, sesionProfesional());
    const r = await elegirPostulante(POSTULACION, TRABAJO);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toBe("Solo el cliente dueño del trabajo puede elegir un postulante.");
  });

  it("rechaza identificadores inválidos", async () => {
    preparar({}, { rol: "cliente", usuario: { id: CLIENTE } });
    const r = await elegirPostulante("x", TRABAJO);
    expect(r).toEqual({ ok: false, mensaje: "Identificador inválido." });
  });

  it("si el trabajo ya no está abierto o el profesional no está disponible, lo explica", async () => {
    preparar(
      { rpc: { elegir_postulante: { data: null, error: { code: "22023" } } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    const r = await elegirPostulante(POSTULACION, TRABAJO);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toBe(
      "No podés elegir a este postulante: el trabajo ya no está abierto o el profesional ya no está disponible.",
    );
  });

  it("elige, registra la métrica y avisa por email", async () => {
    preparar(
      { rpc: { elegir_postulante: { data: PROFESIONAL, error: null } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    const r = await elegirPostulante(POSTULACION, TRABAJO);
    expect(r).toEqual({ ok: true, profesionalId: PROFESIONAL });
    expect(registrarEventoServidor).toHaveBeenCalledWith(CLIENTE, "postulante_elegido");
    expect(avisarEleccion).toHaveBeenCalledWith(TRABAJO, CLIENTE);
  });
});

describe("cancelarTrabajo y marcarTrabajoTerminado (LAB-29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancelar: solo el cliente, y un error de la función se informa", async () => {
    preparar({}, sesionProfesional());
    expect((await cancelarTrabajo(TRABAJO)).mensaje).toBe(
      "Solo el cliente dueño puede cancelar el trabajo.",
    );

    preparar(
      { rpc: { cancelar_trabajo: { data: null, error: { code: "22023" } } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    expect(await cancelarTrabajo(TRABAJO)).toEqual({
      ok: false,
      mensaje: "No se pudo cancelar el trabajo.",
    });
  });

  it("cancelar: con éxito devuelve ok", async () => {
    preparar(
      { rpc: { cancelar_trabajo: { data: true, error: null } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    expect(await cancelarTrabajo(TRABAJO)).toEqual({ ok: true });
  });

  it("cancelar: quita del bucket privado las fotos del trabajo (LAB-52)", async () => {
    const ruta = `${CLIENTE}/${TRABAJO}/0-1.jpg`;
    const { llamadas } = preparar(
      {
        trabajo: { id: TRABAJO, oficio: "gas", estado: "abierto" },
        archivosDelTrabajo: ["0-1.jpg"],
        rpc: { cancelar_trabajo: { data: true, error: null } },
      },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );

    expect(await cancelarTrabajo(TRABAJO)).toEqual({ ok: true });
    expect(llamadas).toContainEqual({
      tabla: "storage:fotos-trabajos",
      metodo: "remove",
      args: [[ruta]],
    });
  });

  it("cancelar: sin fotos no llama a Storage", async () => {
    const { llamadas } = preparar(
      {
        trabajo: { id: TRABAJO, oficio: "gas", estado: "abierto" },
        archivosDelTrabajo: [],
        rpc: { cancelar_trabajo: { data: true, error: null } },
      },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );

    expect(await cancelarTrabajo(TRABAJO)).toEqual({ ok: true });
    expect(llamadas.some((l) => l.metodo === "remove")).toBe(false);
  });

  it("terminar: solo el cliente, y un error se informa", async () => {
    preparar({}, sesionProfesional());
    expect((await marcarTrabajoTerminado(TRABAJO)).mensaje).toBe(
      "Solo el cliente dueño puede marcar el trabajo como terminado.",
    );

    preparar(
      { rpc: { marcar_trabajo_terminado: { data: null, error: { code: "22023" } } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    expect(await marcarTrabajoTerminado(TRABAJO)).toEqual({
      ok: false,
      mensaje: "No se pudo marcar el trabajo como terminado.",
    });
  });

  it("terminar: con éxito devuelve ok", async () => {
    preparar(
      { rpc: { marcar_trabajo_terminado: { data: true, error: null } } },
      { rol: "cliente", usuario: { id: CLIENTE } },
    );
    expect(await marcarTrabajoTerminado(TRABAJO)).toEqual({ ok: true });
  });
});

describe("límites persistentes (LAB-47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("postular cuenta el intento por profesional: 30 por día", async () => {
    const usuario = "66666666-6666-4666-8666-666666666666";
    preparar({ perfil: perfilOk, trabajo: trabajoOk }, sesionProfesional(usuario));
    await postularme(TRABAJO, {}, datosPostulacion());
    expect(limitarPersistente).toHaveBeenCalledWith(`postulacion:${usuario}`, {
      maximo: 30,
      ventanaMs: 24 * 60 * 60 * 1000,
    });
  });

  it("postular: si el límite persistente bloquea, no escribe", async () => {
    const { llamadas } = preparar({ perfil: perfilOk, trabajo: trabajoOk });
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 60,
    });

    const r = await postularme(TRABAJO, {}, datosPostulacion());

    expect(r.mensaje).toBe("Alcanzaste el límite de 30 postulaciones por día. Intentá mañana.");
    expect(llamadas.some((l) => l.metodo === "insert")).toBe(false);
  });

  it("publicar: cuenta el intento por cliente, 5 cada 10 minutos, y si bloquea no escribe", async () => {
    preparar({}, { rol: "cliente", usuario: { id: CLIENTE } });
    vi.mocked(limitarPersistente).mockResolvedValueOnce({
      permitido: false,
      segundosParaReintentar: 9,
    });
    const datos = new FormData();
    for (const [clave, valor] of Object.entries({
      oficio: "gas",
      titulo: "Olor a gas en la cocina",
      descripcion: "Desde ayer hay olor a gas cerca del horno. Ya cerré la llave de paso.",
      barrioId: "51",
      urgencia: "lo_antes_posible",
      presupuesto: "",
      cantidadFotos: "0",
    })) {
      datos.set(clave, valor);
    }

    const r = await publicarTrabajo({}, datos);

    expect(limitarPersistente).toHaveBeenCalledWith(`publicar-trabajo:${CLIENTE}`, {
      maximo: 5,
      ventanaMs: 10 * 60_000,
    });
    expect(r.mensaje).toBe("Hiciste demasiados intentos. Esperá 9 segundos y probá de nuevo.");
    expect(crearClienteServidor).not.toHaveBeenCalled();
  });
});
