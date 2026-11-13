import { describe, expect, it } from "vitest";

import {
  type ClienteSondeo,
  correrSondeoDesdeEntorno,
  ejecutarSondeoSeguridad,
  formatearResumenSondeo,
  type RespuestaConsulta,
  type RespuestaDescargaStorage,
  type RespuestaListaStorage,
  validarConfiguracionSondeo,
} from "../../scripts/sondeo-seguridad";

interface OverridesMock {
  consultas?: Record<string, RespuestaConsulta>;
  listasStorage?: Record<string, RespuestaListaStorage>;
  descargasStorage?: Record<string, RespuestaDescargaStorage>;
}

function crearClienteMockSeguro(overrides: OverridesMock = {}): ClienteSondeo {
  const errorPermiso = { code: "42501", message: "permission denied" };
  const errorColumna = { code: "42703", message: "column does not exist" };

  return {
    from(tabla: string) {
      return {
        select(columnas: string) {
          return {
            async limit(_cantidad: number): Promise<RespuestaConsulta> {
              const claveExacta = `${tabla}:${columnas}`;
              if (overrides.consultas?.[claveExacta]) {
                return overrides.consultas[claveExacta];
              }
              if (overrides.consultas?.[tabla]) {
                return overrides.consultas[tabla];
              }

              if (tabla === "barrios") {
                return { data: [{ id: 1 }], error: null };
              }

              if (tabla === "usuarios_publicos") {
                if (columnas === "*") {
                  return {
                    data: [
                      {
                        id: "00000000-0000-4000-a000-000000000021",
                        nombre: "Jorge",
                        apellido_inicial: "R",
                        barrio_id: 1,
                        foto_path: null,
                      },
                    ],
                    error: null,
                  };
                }
                return { data: null, error: errorColumna };
              }

              if (tabla === "resenas_publicas") {
                if (columnas === "*") {
                  return {
                    data: [
                      {
                        id: "00000000-0000-4000-c000-000000000001",
                        profesional_id: "00000000-0000-4000-a000-000000000021",
                        puntaje: 5,
                        texto: "Excelente trabajo",
                        created_at: "2026-10-15T12:00:00Z",
                        autor_nombre: "Lucía",
                        autor_inicial: "F",
                      },
                    ],
                    error: null,
                  };
                }
                return { data: null, error: errorColumna };
              }

              return { data: null, error: errorPermiso };
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        return {
          async list(carpeta = ""): Promise<RespuestaListaStorage> {
            const clave = `${bucket}:${carpeta}`;
            if (overrides.listasStorage?.[clave]) {
              return overrides.listasStorage[clave];
            }
            if (overrides.listasStorage?.[bucket]) {
              return overrides.listasStorage[bucket];
            }
            return { data: [], error: null };
          },
          async download(ruta: string): Promise<RespuestaDescargaStorage> {
            const clave = `${bucket}:${ruta}`;
            if (overrides.descargasStorage?.[clave]) {
              return overrides.descargasStorage[clave];
            }
            if (overrides.descargasStorage?.[bucket]) {
              return overrides.descargasStorage[bucket];
            }
            return {
              data: null,
              error: { message: "Object not found", status: 400 },
            };
          },
        };
      },
    },
  };
}

function crearJwtFalso(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.firma`;
}

describe("validarConfiguracionSondeo", () => {
  it("acepta URL local o remota válida con anon key", () => {
    const jwtAnon = crearJwtFalso({ role: "anon" });
    const res = validarConfiguracionSondeo({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtAnon,
    });
    expect(res).toEqual({
      ok: true,
      url: "http://127.0.0.1:54321",
      anonKey: jwtAnon,
    });
  });

  it("rechaza cuando falta NEXT_PUBLIC_SUPABASE_URL o no es http/https", () => {
    expect(
      validarConfiguracionSondeo({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }).ok,
    ).toBe(false);

    expect(
      validarConfiguracionSondeo({
        NEXT_PUBLIC_SUPABASE_URL: "ftp://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }).ok,
    ).toBe(false);

    expect(
      validarConfiguracionSondeo({
        NEXT_PUBLIC_SUPABASE_URL: "no-es-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }).ok,
    ).toBe(false);
  });

  it("rechaza cuando falta NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    const res = validarConfiguracionSondeo({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si se pasa una clave service_role como anon key", () => {
    const jwtService = crearJwtFalso({ role: "service_role" });
    expect(
      validarConfiguracionSondeo({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtService,
      }).ok,
    ).toBe(false);

    expect(
      validarConfiguracionSondeo({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "misma-clave",
        SUPABASE_SERVICE_ROLE_KEY: "misma-clave",
      }).ok,
    ).toBe(false);
  });
});

describe("ejecutarSondeoSeguridad", () => {
  it("pasa todos los controles cuando RLS, grants y buckets privados bloquean a anon", async () => {
    const cliente = crearClienteMockSeguro();
    const resumen = await ejecutarSondeoSeguridad(cliente);

    expect(resumen.ok).toBe(true);
    expect(resumen.fallidos).toBe(0);
    expect(resumen.aprobados).toBe(resumen.total);
    expect(resumen.resultados.every((r) => r.ok)).toBe(true);

    const texto = formatearResumenSondeo(resumen);
    expect(texto).toContain("[PASS] verificaciones_bloqueada");
    expect(texto).toContain("[PASS] contactos_bloqueada");
    expect(texto).toContain("[PASS] usuarios_privados_bloqueados");
    expect(texto).toContain("[PASS] resenas_sin_autor_ni_trabajo");
    expect(texto).toContain("[PASS] bucket_documentos_privado");
    expect(texto).toContain("[PASS] bucket_fotos_trabajos_privado");
    expect(texto).not.toContain("[FAIL]");
  });

  it("falla si public.barrios no responde con anon (evita falsos positivos con servidor caído)", async () => {
    const cliente = crearClienteMockSeguro({
      consultas: {
        barrios: { data: null, error: { message: "TypeError: fetch failed" } },
      },
    });
    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    expect(resumen.resultados.find((r) => r.id === "conectividad_barrios")?.ok).toBe(false);
  });

  it("falla si un error de red se produce al consultar una tabla protegida", async () => {
    const cliente = crearClienteMockSeguro({
      consultas: {
        verificaciones: { data: null, error: { message: "connect ECONNREFUSED 127.0.0.1:54321" } },
      },
    });
    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    expect(resumen.resultados.find((r) => r.id === "verificaciones_bloqueada")?.ok).toBe(false);
  });

  it("detecta filtración en public.verificaciones sin imprimir rutas ni ids en la salida", async () => {
    const rutaSecreta = "secreto-uid-123/dni_frente-999999.jpg";
    const cliente = crearClienteMockSeguro({
      consultas: {
        verificaciones: {
          data: [{ id: "verif-1", usuario_id: "secreto-uid-123", storage_path: rutaSecreta }],
          error: null,
        },
      },
    });

    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    expect(resumen.resultados.find((r) => r.id === "verificaciones_bloqueada")?.ok).toBe(false);

    const salida = formatearResumenSondeo(resumen);
    expect(salida).toContain("[FAIL] verificaciones_bloqueada");
    expect(salida).not.toContain(rutaSecreta);
    expect(salida).not.toContain("secreto-uid-123");
  });

  it("detecta filtración en public.contactos sin imprimir ids en la salida", async () => {
    const cliente = crearClienteMockSeguro({
      consultas: {
        contactos: {
          data: [{ id: "c-1", cliente_id: "cli-secreto", profesional_id: "pro-secreto" }],
          error: null,
        },
      },
    });

    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    expect(resumen.resultados.find((r) => r.id === "contactos_bloqueada")?.ok).toBe(false);

    const salida = formatearResumenSondeo(resumen);
    expect(salida).toContain("[FAIL] contactos_bloqueada");
    expect(salida).not.toContain("cli-secreto");
    expect(salida).not.toContain("pro-secreto");
  });

  it("detecta filtración de filas o columnas privadas en public.usuarios y public.usuarios_publicos sin imprimir datos personales", async () => {
    const whatsappSecreto = "+5492235559999";
    const clienteTabla = crearClienteMockSeguro({
      consultas: {
        usuarios: {
          data: [
            {
              id: "u-1",
              whatsapp: whatsappSecreto,
              estado: "activa",
              normas_aceptadas_at: "2026-10-15T00:00:00Z",
              datos_sensibles_consentidos_at: "2026-10-15T00:00:00Z",
            },
          ],
          error: null,
        },
      },
    });

    const resumenTabla = await ejecutarSondeoSeguridad(clienteTabla);
    expect(resumenTabla.ok).toBe(false);
    expect(resumenTabla.resultados.find((r) => r.id === "usuarios_privados_bloqueados")?.ok).toBe(
      false,
    );
    expect(formatearResumenSondeo(resumenTabla)).not.toContain(whatsappSecreto);

    const clienteVista = crearClienteMockSeguro({
      consultas: {
        "usuarios_publicos:*": {
          data: [
            {
              id: "u-1",
              nombre: "Jorge",
              apellido_inicial: "R",
              whatsapp: whatsappSecreto,
            },
          ],
          error: null,
        },
      },
    });

    const resumenVista = await ejecutarSondeoSeguridad(clienteVista);
    expect(resumenVista.ok).toBe(false);
    const chequeoVista = resumenVista.resultados.find(
      (r) => r.id === "usuarios_privados_bloqueados",
    );
    expect(chequeoVista?.ok).toBe(false);
    expect(chequeoVista?.detalle).toContain("whatsapp");
    expect(formatearResumenSondeo(resumenVista)).not.toContain(whatsappSecreto);
  });

  it("detecta filtración de matricula_numero en perfiles_profesionales o matricula_propia", async () => {
    const matriculaSecreta = "MP-99999";
    const cliente = crearClienteMockSeguro({
      consultas: {
        "perfiles_profesionales:matricula_numero": {
          data: [{ matricula_numero: matriculaSecreta }],
          error: null,
        },
      },
    });

    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    expect(resumen.resultados.find((r) => r.id === "perfiles_sin_matricula_numero")?.ok).toBe(
      false,
    );
    expect(formatearResumenSondeo(resumen)).not.toContain(matriculaSecreta);
  });

  it("detecta filtración de autor_id o trabajo_id en resenas y resenas_publicas (LAB-56)", async () => {
    const autorSecreto = "autor-uuid-secreto";
    const trabajoSecreto = "trabajo-uuid-secreto";

    const clienteTabla = crearClienteMockSeguro({
      consultas: {
        resenas: {
          data: [{ id: "r-1", autor_id: autorSecreto, trabajo_id: trabajoSecreto }],
          error: null,
        },
      },
    });
    const resumenTabla = await ejecutarSondeoSeguridad(clienteTabla);
    expect(resumenTabla.ok).toBe(false);
    expect(resumenTabla.resultados.find((r) => r.id === "resenas_sin_autor_ni_trabajo")?.ok).toBe(
      false,
    );
    expect(formatearResumenSondeo(resumenTabla)).not.toContain(autorSecreto);

    const clienteVista = crearClienteMockSeguro({
      consultas: {
        "resenas_publicas:*": {
          data: [
            {
              id: "r-1",
              profesional_id: "p-1",
              puntaje: 5,
              texto: "Bien",
              trabajo_id: trabajoSecreto,
            },
          ],
          error: null,
        },
      },
    });
    const resumenVista = await ejecutarSondeoSeguridad(clienteVista);
    expect(resumenVista.ok).toBe(false);
    const chequeoVista = resumenVista.resultados.find(
      (r) => r.id === "resenas_sin_autor_ni_trabajo",
    );
    expect(chequeoVista?.ok).toBe(false);
    expect(chequeoVista?.detalle).toContain("trabajo_id");
    expect(formatearResumenSondeo(resumenVista)).not.toContain(trabajoSecreto);
  });

  it("detecta si alguna tabla interna (trabajos, postulaciones, reportes, moderación, accesos) permite lectura a anon", async () => {
    const cliente = crearClienteMockSeguro({
      consultas: {
        reportes: {
          data: [{ id: "rep-secreto-1" }],
          error: null,
        },
      },
    });

    const resumen = await ejecutarSondeoSeguridad(cliente);
    expect(resumen.ok).toBe(false);
    const chequeo = resumen.resultados.find((r) => r.id === "tablas_internas_bloqueadas");
    expect(chequeo?.ok).toBe(false);
    expect(chequeo?.detalle).toContain("public.reportes");
    expect(formatearResumenSondeo(resumen)).not.toContain("rep-secreto-1");
  });

  it("detecta si los buckets privados 'documentos' o 'fotos-trabajos' permiten listar o descargar con anon", async () => {
    const nombreSecreto = "dni-secreto-12345678.jpg";
    const clienteListaDoc = crearClienteMockSeguro({
      listasStorage: {
        "documentos:": {
          data: [{ name: nombreSecreto }],
          error: null,
        },
      },
    });

    const resumenDoc = await ejecutarSondeoSeguridad(clienteListaDoc);
    expect(resumenDoc.ok).toBe(false);
    expect(resumenDoc.resultados.find((r) => r.id === "bucket_documentos_privado")?.ok).toBe(false);
    expect(formatearResumenSondeo(resumenDoc)).not.toContain(nombreSecreto);

    const clienteDescargaFotos = crearClienteMockSeguro({
      descargasStorage: {
        "fotos-trabajos": {
          data: new Blob(["contenido-privado"]),
          error: null,
        },
      },
    });

    const resumenFotos = await ejecutarSondeoSeguridad(clienteDescargaFotos);
    expect(resumenFotos.ok).toBe(false);
    expect(resumenFotos.resultados.find((r) => r.id === "bucket_fotos_trabajos_privado")?.ok).toBe(
      false,
    );
  });
});

describe("correrSondeoDesdeEntorno", () => {
  it("termina con código 0 cuando la configuración es válida y todos los controles pasan", async () => {
    let stdout = "";
    let stderr = "";
    const codigo = await correrSondeoDesdeEntorno(
      {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: crearJwtFalso({ role: "anon" }),
      },
      (t) => {
        stdout += t;
      },
      (t) => {
        stderr += t;
      },
      () => crearClienteMockSeguro(),
    );

    expect(codigo).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("9/9 controles en PASS (PASS)");
  });

  it("termina con código 1 cuando falla algún control o falta configuración", async () => {
    let stderr = "";
    const codigoSinConfig = await correrSondeoDesdeEntorno(
      {},
      () => {},
      (t) => {
        stderr += t;
      },
      () => crearClienteMockSeguro(),
    );
    expect(codigoSinConfig).toBe(1);
    expect(stderr).toContain("[FAIL] configuracion");

    let stdout = "";
    const codigoConFalla = await correrSondeoDesdeEntorno(
      {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: crearJwtFalso({ role: "anon" }),
      },
      (t) => {
        stdout += t;
      },
      () => {},
      () =>
        crearClienteMockSeguro({
          consultas: {
            contactos: { data: [{ id: "1" }], error: null },
          },
        }),
    );
    expect(codigoConFalla).toBe(1);
    expect(stdout).toContain("[FAIL] contactos_bloqueada");
  });
});
