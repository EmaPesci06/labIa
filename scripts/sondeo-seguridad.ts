/**
 * LAB-58 · Sondeo de seguridad contra la API de Supabase usando únicamente el rol `anon`.
 *
 * Verifica en vivo que las políticas RLS, los grants por columna, las vistas públicas y los
 * buckets privados (`documentos` y `fotos-trabajos`) rechacen lecturas no autorizadas:
 *   - `public.verificaciones` y `public.mis_verificaciones` no devuelven filas a `anon`.
 *   - `public.contactos` no devuelve filas a `anon`.
 *   - `public.usuarios` no permite leer filas ni columnas privadas (`whatsapp`, `estado`,
 *     `normas_aceptadas_at`, `datos_sensibles_consentidos_at`, etc.) con `anon`, y la vista
 *     `public.usuarios_publicos` no expone esas columnas.
 *   - `public.perfiles_profesionales` y `public.matricula_propia` no exponen `matricula_numero`
 *     a `anon`.
 *   - `public.resenas` y `public.resenas_publicas` no permiten a `anon` leer `autor_id` ni
 *     `trabajo_id` (LAB-56).
 *   - Las tablas internas (`trabajos`, `postulaciones`, `reportes`, `acciones_moderacion`,
 *     `accesos_documentos`) no devuelven filas a `anon`.
 *   - Los buckets privados `documentos` y `fotos-trabajos` (LAB-52) no permiten listar ni
 *     descargar objetos con `anon`.
 *
 * Nunca imprime valores de filas, datos personales ni claves en la salida estándar: solo
 * informa PASS/FAIL por control y termina con código 1 si falla algún chequeo o 0 si pasan todos.
 *
 * Uso (Node 24 ejecuta TypeScript directo):
 *   node scripts/sondeo-seguridad.ts
 */

import { createClient } from "@supabase/supabase-js";

export interface ErrorSondeo {
  message?: string;
  code?: string;
  status?: number;
}

export interface RespuestaConsulta {
  data: Record<string, unknown>[] | null;
  error: ErrorSondeo | null;
}

export interface RespuestaListaStorage {
  data: { name?: string }[] | null;
  error: ErrorSondeo | null;
}

export interface RespuestaDescargaStorage {
  data: Blob | null;
  error: ErrorSondeo | null;
}

export interface ClienteSondeo {
  from: (tabla: string) => {
    select: (columnas: string) => {
      limit: (cantidad: number) => PromiseLike<RespuestaConsulta>;
    };
  };
  storage: {
    from: (bucket: string) => {
      list: (carpeta?: string, opciones?: { limit?: number }) => PromiseLike<RespuestaListaStorage>;
      download: (ruta: string) => PromiseLike<RespuestaDescargaStorage>;
    };
  };
}

export interface ResultadoChequeo {
  id: string;
  descripcion: string;
  ok: boolean;
  detalle: string;
}

export interface ResumenSondeo {
  ok: boolean;
  total: number;
  aprobados: number;
  fallidos: number;
  resultados: ResultadoChequeo[];
}

export const COLUMNAS_PRIVADAS_USUARIO = [
  "whatsapp",
  "apellido",
  "estado",
  "rol",
  "normas_version",
  "normas_aceptadas_at",
  "datos_sensibles_version",
  "datos_sensibles_consentidos_at",
] as const;

export const COLUMNAS_PRIVADAS_RESENA = ["autor_id", "trabajo_id"] as const;

export const TABLAS_INTERNAS_SIN_LECTURA_ANON = [
  "trabajos",
  "postulaciones",
  "reportes",
  "acciones_moderacion",
  "accesos_documentos",
] as const;

const RUTA_PRUEBA_DOCUMENTOS = "00000000-0000-4000-a000-000000000021/dni_frente-1791734400000.jpg";
const CARPETA_PRUEBA_DOCUMENTOS = "00000000-0000-4000-a000-000000000021";

const CARPETA_PRUEBA_FOTOS_TRABAJOS =
  "00000000-0000-4000-a000-000000000011/00000000-0000-4000-b000-000000000001";
const RUTA_PRUEBA_FOTOS_TRABAJOS = `${CARPETA_PRUEBA_FOTOS_TRABAJOS}/0-1791734400000.jpg`;

function esJwtServiceRole(token: string): boolean {
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[1]) return false;
  try {
    const json = Buffer.from(partes[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export function validarConfiguracionSondeo(
  env: Record<string, string | undefined>,
): { ok: true; url: string; anonKey: string } | { ok: false; motivo: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url) {
    return {
      ok: false,
      motivo: "Falta definir NEXT_PUBLIC_SUPABASE_URL para ejecutar el sondeo de seguridad.",
    };
  }

  try {
    const parseada = new URL(url);
    if (parseada.protocol !== "http:" && parseada.protocol !== "https:") {
      return {
        ok: false,
        motivo: "NEXT_PUBLIC_SUPABASE_URL debe usar el protocolo http: o https:.",
      };
    }
  } catch {
    return {
      ok: false,
      motivo: "NEXT_PUBLIC_SUPABASE_URL no es una URL válida.",
    };
  }

  if (!anonKey) {
    return {
      ok: false,
      motivo: "Falta definir NEXT_PUBLIC_SUPABASE_ANON_KEY para ejecutar el sondeo de seguridad.",
    };
  }

  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if ((serviceRole && anonKey === serviceRole) || esJwtServiceRole(anonKey)) {
    return {
      ok: false,
      motivo:
        "NEXT_PUBLIC_SUPABASE_ANON_KEY corresponde a service_role; el sondeo debe correr solo como anon.",
    };
  }

  return { ok: true, url, anonKey };
}

export function esErrorDeConexionOCredencial(error: ErrorSondeo | null | undefined): boolean {
  if (!error) return false;
  const mensaje = (error.message ?? "").toLowerCase();
  return (
    mensaje.includes("fetch failed") ||
    mensaje.includes("econnrefused") ||
    mensaje.includes("enotfound") ||
    mensaje.includes("etimedout") ||
    mensaje.includes("networkerror") ||
    mensaje.includes("invalid api key") ||
    mensaje.includes("jwserror") ||
    mensaje.includes("jwtexpired")
  );
}

function lecturaTablaBloqueada(respuesta: RespuestaConsulta): { ok: boolean; detalle: string } {
  if (esErrorDeConexionOCredencial(respuesta.error)) {
    return { ok: false, detalle: "error de conexión o de credencial al consultar la API" };
  }
  if (respuesta.error !== null) {
    return { ok: true, detalle: "lectura rechazada por permisos/RLS para anon" };
  }
  const filas = Array.isArray(respuesta.data) ? respuesta.data.length : 0;
  if (filas === 0) {
    return { ok: true, detalle: "0 filas devueltas para anon" };
  }
  return { ok: false, detalle: `devolvió ${filas} fila(s) al rol anon` };
}

async function chequearConectividadBarrios(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "conectividad_barrios";
  const descripcion = "public.barrios responde a lectura pública con rol anon";
  const res = await cliente.from("barrios").select("id").limit(1);
  if (res.error !== null || !Array.isArray(res.data) || res.data.length === 0) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "no se pudo leer public.barrios con anon (verificar API y clave anon)",
    };
  }
  return {
    id,
    descripcion,
    ok: true,
    detalle: "API accesible con rol anon",
  };
}

async function chequearVerificaciones(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "verificaciones_bloqueada";
  const descripcion = "public.verificaciones y public.mis_verificaciones no devuelven filas a anon";
  const [resTabla, resVista] = await Promise.all([
    cliente.from("verificaciones").select("id, usuario_id, storage_path").limit(1),
    cliente.from("mis_verificaciones").select("id, tipo, estado").limit(1),
  ]);

  const evalTabla = lecturaTablaBloqueada(resTabla);
  if (!evalTabla.ok) {
    return { id, descripcion, ok: false, detalle: `public.verificaciones: ${evalTabla.detalle}` };
  }

  const evalVista = lecturaTablaBloqueada(resVista);
  if (!evalVista.ok) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: `public.mis_verificaciones: ${evalVista.detalle}`,
    };
  }

  return {
    id,
    descripcion,
    ok: true,
    detalle: "verificaciones y mis_verificaciones bloqueadas para anon",
  };
}

async function chequearContactos(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "contactos_bloqueada";
  const descripcion = "public.contactos no devuelve filas ni permite lectura a anon";
  const res = await cliente.from("contactos").select("id, cliente_id, profesional_id").limit(1);
  const evaluacion = lecturaTablaBloqueada(res);
  return {
    id,
    descripcion,
    ok: evaluacion.ok,
    detalle: `public.contactos: ${evaluacion.detalle}`,
  };
}

async function chequearUsuariosPrivados(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "usuarios_privados_bloqueados";
  const descripcion =
    "public.usuarios y public.usuarios_publicos no exponen filas ni columnas privadas a anon";

  const [resUsuariosPrivadas, resUsuariosId, resVistaColumnasPrivadas, resVistaPublica] =
    await Promise.all([
      cliente
        .from("usuarios")
        .select("id, whatsapp, estado, normas_aceptadas_at, datos_sensibles_consentidos_at")
        .limit(1),
      cliente.from("usuarios").select("id").limit(1),
      cliente
        .from("usuarios_publicos")
        .select("whatsapp, estado, normas_aceptadas_at, datos_sensibles_consentidos_at, apellido")
        .limit(1),
      cliente.from("usuarios_publicos").select("*").limit(5),
    ]);

  const evalPrivadas = lecturaTablaBloqueada(resUsuariosPrivadas);
  if (!evalPrivadas.ok) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: `public.usuarios (columnas privadas): ${evalPrivadas.detalle}`,
    };
  }

  const evalId = lecturaTablaBloqueada(resUsuariosId);
  if (!evalId.ok) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: `public.usuarios (lectura general): ${evalId.detalle}`,
    };
  }

  if (esErrorDeConexionOCredencial(resVistaColumnasPrivadas.error)) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.usuarios_publicos: error de conexión o de credencial",
    };
  }

  if (resVistaColumnasPrivadas.error === null) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.usuarios_publicos permitió seleccionar columnas privadas con anon",
    };
  }

  if (esErrorDeConexionOCredencial(resVistaPublica.error) || resVistaPublica.error !== null) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.usuarios_publicos no pudo verificarse con select(*)",
    };
  }

  const filasVista = Array.isArray(resVistaPublica.data) ? resVistaPublica.data : [];
  for (const fila of filasVista) {
    for (const col of COLUMNAS_PRIVADAS_USUARIO) {
      if (col in fila) {
        return {
          id,
          descripcion,
          ok: false,
          detalle: `public.usuarios_publicos expuso la columna privada '${col}' a anon`,
        };
      }
    }
  }

  return {
    id,
    descripcion,
    ok: true,
    detalle: "usuarios bloqueada y usuarios_publicos sin columnas privadas",
  };
}

async function chequearPerfilesSinMatricula(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "perfiles_sin_matricula_numero";
  const descripcion =
    "public.perfiles_profesionales y public.matricula_propia no exponen matricula_numero a anon";

  const [resColumna, resVista] = await Promise.all([
    cliente.from("perfiles_profesionales").select("matricula_numero").limit(1),
    cliente.from("matricula_propia").select("usuario_id, matricula_numero").limit(1),
  ]);

  if (esErrorDeConexionOCredencial(resColumna.error)) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.perfiles_profesionales: error de conexión o de credencial",
    };
  }

  if (resColumna.error === null) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.perfiles_profesionales permitió seleccionar matricula_numero con anon",
    };
  }

  const evalVista = lecturaTablaBloqueada(resVista);
  if (!evalVista.ok) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: `public.matricula_propia: ${evalVista.detalle}`,
    };
  }

  return {
    id,
    descripcion,
    ok: true,
    detalle: "matricula_numero y matricula_propia bloqueadas para anon",
  };
}

async function chequearResenasPrivacidad(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "resenas_sin_autor_ni_trabajo";
  const descripcion =
    "public.resenas y public.resenas_publicas no permiten a anon leer autor_id ni trabajo_id (LAB-56)";

  const [resTabla, resVistaIds, resVistaPublica] = await Promise.all([
    cliente.from("resenas").select("id, autor_id, trabajo_id").limit(1),
    cliente.from("resenas_publicas").select("autor_id, trabajo_id").limit(1),
    cliente.from("resenas_publicas").select("*").limit(5),
  ]);

  const evalTabla = lecturaTablaBloqueada(resTabla);
  if (!evalTabla.ok) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: `public.resenas: ${evalTabla.detalle}`,
    };
  }

  if (esErrorDeConexionOCredencial(resVistaIds.error)) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.resenas_publicas: error de conexión o de credencial",
    };
  }

  if (resVistaIds.error === null) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.resenas_publicas permitió seleccionar autor_id/trabajo_id con anon",
    };
  }

  if (esErrorDeConexionOCredencial(resVistaPublica.error) || resVistaPublica.error !== null) {
    return {
      id,
      descripcion,
      ok: false,
      detalle: "public.resenas_publicas no pudo verificarse con select(*)",
    };
  }

  const filasVista = Array.isArray(resVistaPublica.data) ? resVistaPublica.data : [];
  for (const fila of filasVista) {
    for (const col of COLUMNAS_PRIVADAS_RESENA) {
      if (col in fila) {
        return {
          id,
          descripcion,
          ok: false,
          detalle: `public.resenas_publicas expuso la columna privada '${col}' a anon`,
        };
      }
    }
  }

  return {
    id,
    descripcion,
    ok: true,
    detalle: "resenas bloqueada para anon y resenas_publicas sin autor_id ni trabajo_id",
  };
}

async function chequearTablasInternas(cliente: ClienteSondeo): Promise<ResultadoChequeo> {
  const id = "tablas_internas_bloqueadas";
  const descripcion =
    "Tablas internas (trabajos, postulaciones, reportes, moderación y accesos) bloqueadas para anon";

  for (const tabla of TABLAS_INTERNAS_SIN_LECTURA_ANON) {
    const res = await cliente.from(tabla).select("id").limit(1);
    const evaluacion = lecturaTablaBloqueada(res);
    if (!evaluacion.ok) {
      return {
        id,
        descripcion,
        ok: false,
        detalle: `public.${tabla}: ${evaluacion.detalle}`,
      };
    }
  }

  return {
    id,
    descripcion,
    ok: true,
    detalle: "todas las tablas internas rechazaron lectura o devolvieron 0 filas a anon",
  };
}

async function chequearBucketPrivado(
  cliente: ClienteSondeo,
  opciones: {
    id: string;
    bucket: string;
    carpetaPrueba: string;
    rutaPrueba: string;
    descripcion: string;
  },
): Promise<ResultadoChequeo> {
  const almacen = cliente.storage.from(opciones.bucket);
  const [resRaiz, resCarpeta, resDescarga] = await Promise.all([
    almacen.list("", { limit: 10 }),
    almacen.list(opciones.carpetaPrueba, { limit: 10 }),
    almacen.download(opciones.rutaPrueba),
  ]);

  if (
    esErrorDeConexionOCredencial(resRaiz.error) ||
    esErrorDeConexionOCredencial(resCarpeta.error) ||
    esErrorDeConexionOCredencial(resDescarga.error)
  ) {
    return {
      id: opciones.id,
      descripcion: opciones.descripcion,
      ok: false,
      detalle: `bucket '${opciones.bucket}': error de conexión o de credencial`,
    };
  }

  const objetosRaiz =
    resRaiz.error === null && Array.isArray(resRaiz.data) ? resRaiz.data.length : 0;
  if (objetosRaiz > 0) {
    return {
      id: opciones.id,
      descripcion: opciones.descripcion,
      ok: false,
      detalle: `bucket '${opciones.bucket}' listó ${objetosRaiz} objeto(s) en la raíz para anon`,
    };
  }

  const objetosCarpeta =
    resCarpeta.error === null && Array.isArray(resCarpeta.data) ? resCarpeta.data.length : 0;
  if (objetosCarpeta > 0) {
    return {
      id: opciones.id,
      descripcion: opciones.descripcion,
      ok: false,
      detalle: `bucket '${opciones.bucket}' listó ${objetosCarpeta} objeto(s) en carpeta interna para anon`,
    };
  }

  if (resDescarga.error === null && resDescarga.data !== null) {
    return {
      id: opciones.id,
      descripcion: opciones.descripcion,
      ok: false,
      detalle: `bucket '${opciones.bucket}' permitió descargar un objeto con anon`,
    };
  }

  return {
    id: opciones.id,
    descripcion: opciones.descripcion,
    ok: true,
    detalle: `bucket '${opciones.bucket}' sin listado ni descarga para anon`,
  };
}

export async function ejecutarSondeoSeguridad(cliente: ClienteSondeo): Promise<ResumenSondeo> {
  const resultados: ResultadoChequeo[] = [
    await chequearConectividadBarrios(cliente),
    await chequearVerificaciones(cliente),
    await chequearContactos(cliente),
    await chequearUsuariosPrivados(cliente),
    await chequearPerfilesSinMatricula(cliente),
    await chequearResenasPrivacidad(cliente),
    await chequearTablasInternas(cliente),
    await chequearBucketPrivado(cliente, {
      id: "bucket_documentos_privado",
      bucket: "documentos",
      carpetaPrueba: CARPETA_PRUEBA_DOCUMENTOS,
      rutaPrueba: RUTA_PRUEBA_DOCUMENTOS,
      descripcion: "Bucket privado 'documentos' no permite listar ni descargar objetos con anon",
    }),
    await chequearBucketPrivado(cliente, {
      id: "bucket_fotos_trabajos_privado",
      bucket: "fotos-trabajos",
      carpetaPrueba: CARPETA_PRUEBA_FOTOS_TRABAJOS,
      rutaPrueba: RUTA_PRUEBA_FOTOS_TRABAJOS,
      descripcion:
        "Bucket privado 'fotos-trabajos' (LAB-52) no permite listar ni descargar objetos con anon",
    }),
  ];

  const aprobados = resultados.filter((r) => r.ok).length;
  const fallidos = resultados.length - aprobados;

  return {
    ok: fallidos === 0,
    total: resultados.length,
    aprobados,
    fallidos,
    resultados,
  };
}

export function formatearResumenSondeo(resumen: ResumenSondeo): string {
  const lineas = resumen.resultados.map(
    (r) => `[${r.ok ? "PASS" : "FAIL"}] ${r.id}: ${r.descripcion} (${r.detalle})`,
  );
  lineas.push(
    `Resultado del sondeo: ${resumen.aprobados}/${resumen.total} controles en PASS (${resumen.ok ? "PASS" : "FAIL"}).`,
  );
  return lineas.join("\n") + "\n";
}

export function crearClienteAnonSondeo(url: string, anonKey: string): ClienteSondeo {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }) as unknown as ClienteSondeo;
}

export async function correrSondeoDesdeEntorno(
  env: Record<string, string | undefined> = process.env,
  escribirSalida: (texto: string) => void = (t) => process.stdout.write(t),
  escribirError: (texto: string) => void = (t) => process.stderr.write(t),
  fabricaCliente: (url: string, anonKey: string) => ClienteSondeo = crearClienteAnonSondeo,
): Promise<0 | 1> {
  const config = validarConfiguracionSondeo(env);
  if (!config.ok) {
    escribirError(`[FAIL] configuracion: ${config.motivo}\n`);
    return 1;
  }

  const cliente = fabricaCliente(config.url, config.anonKey);
  const resumen = await ejecutarSondeoSeguridad(cliente);
  escribirSalida(formatearResumenSondeo(resumen));
  return resumen.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith("sondeo-seguridad.ts")) {
  const codigo = await correrSondeoDesdeEntorno();
  process.exitCode = codigo;
}
