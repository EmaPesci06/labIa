// Supabase FALSO para las pruebas del perfil público (LAB-24) y del panel de verificación (LAB-21)
// en máquinas sin Docker. Responde solo lo que usan /profesionales/[id], /cuenta/perfil y
// /admin/verificaciones, decide "quién mira" por el token (Authorization: Bearer ...) y no guarda
// nada (las decisiones y los accesos a documentos se anotan solo en memoria, para que la prueba los
// lea). No es una prueba de la base: la RLS y las funciones se prueban en supabase/tests/database.
//
// Uso: LABIA_SUPABASE_FALSO_PUERTO=54399 node tests/e2e/apoyo/supabase-falso.cjs
//
// Rutas de prueba (solo para Playwright, no las usa la app):
//   GET /__decisiones  -> decisiones recibidas por decidir_documento (cuerpo del RPC)
//   GET /__accesos     -> accesos registrados en accesos_documentos (firmas de URL)
const http = require("node:http");
const zlib = require("node:zlib");

const PUERTO = Number(process.env.LABIA_SUPABASE_FALSO_PUERTO ?? 54399);

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const ID_EN_REVISION = "22222222-2222-4222-8222-222222222222";
const ID_CLIENTE = "33333333-3333-4333-8333-333333333333";
const ID_ADMIN = "44444444-4444-4444-8444-444444444444";
const ID_RECHAZADO = "55555555-5555-4555-8555-555555555555";

// token -> usuario
const USUARIOS = {
  "tok-cliente": {
    id: ID_CLIENTE,
    rol: "cliente",
    nombre: "Laura",
    apellido: "Fernández",
    barrio_id: 1,
  },
  "tok-dueno": {
    id: ID_PUBLICADO,
    rol: "profesional",
    nombre: "Martín",
    apellido: "Gómez",
    barrio_id: 2,
  },
  "tok-dueno-revision": {
    id: ID_EN_REVISION,
    rol: "profesional",
    nombre: "Sofía",
    apellido: "Ríos",
    barrio_id: 2,
  },
  "tok-admin": {
    id: ID_ADMIN,
    rol: "admin",
    nombre: "Ana",
    apellido: "Mora",
    barrio_id: null,
  },
};

const TOTAL_RESENAS = 25;
const ahora = Date.now();
const hace = (horas) => new Date(ahora - horas * 3_600_000).toISOString();
// Reseña 1 tiene el autor borrado (autor_id null); el resto es de Laura F.
const resenas = Array.from({ length: TOTAL_RESENAS }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  autor_id: i === 1 ? null : ID_CLIENTE,
  puntaje: 5 - (i % 2),
  texto: `Reseña número ${i + 1}`,
  created_at: new Date(ahora - (i + 1) * 3_600_000).toISOString(),
}));

// ---------------------------------------------------------------------------------------------
// Panel de verificación (LAB-21): datos del admin.
// ---------------------------------------------------------------------------------------------

const BARRIOS = [
  { id: 1, nombre: "Centro" },
  { id: 2, nombre: "La Perla" },
  { id: 3, nombre: "Güemes" },
];

// Usuarios que ve el admin (por id). Martín ya está publicado; Sofía y Diego esperan revisión.
const USUARIOS_ADMIN = [
  {
    id: ID_ADMIN,
    rol: "admin",
    estado: "activa",
    nombre: "Ana",
    apellido: "Mora",
    whatsapp: null,
    barrio_id: null,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(240),
  },
  {
    id: ID_PUBLICADO,
    rol: "profesional",
    estado: "activa",
    nombre: "Martín",
    apellido: "Gómez",
    whatsapp: "+5492236000001",
    barrio_id: 3,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(96),
  },
  {
    id: ID_EN_REVISION,
    rol: "profesional",
    estado: "activa",
    nombre: "Sofía",
    apellido: "Ríos",
    whatsapp: "+5492236000002",
    barrio_id: 2,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(70),
  },
  {
    id: ID_RECHAZADO,
    rol: "profesional",
    estado: "activa",
    nombre: "Diego",
    apellido: "Paz",
    whatsapp: "+5492236000003",
    barrio_id: 1,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(200),
  },
  {
    id: ID_CLIENTE,
    rol: "cliente",
    estado: "activa",
    nombre: "Laura",
    apellido: "Fernández",
    whatsapp: null,
    barrio_id: 1,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(300),
  },
];

const PERFILES_ADMIN = [
  {
    usuario_id: ID_PUBLICADO,
    oficios: ["gas", "plomeria"],
    publicado: true,
    identidad_verificada: true,
    antecedentes_ok: true,
    matriculado: true,
  },
  {
    usuario_id: ID_EN_REVISION,
    oficios: ["electricidad"],
    publicado: false,
    identidad_verificada: false,
    antecedentes_ok: false,
    matriculado: false,
  },
  {
    usuario_id: ID_RECHAZADO,
    oficios: ["plomeria"],
    publicado: false,
    identidad_verificada: false,
    antecedentes_ok: false,
    matriculado: false,
  },
];

const MATRICULAS_ADMIN = [{ usuario_id: ID_PUBLICADO, matricula_numero: "GAS-2041" }];

// Documentos de verificación. La ruta sigue <usuario_id>/<tipo>-<timestamp>.<ext>.
const VERIFICACIONES = [
  // Sofía: dos documentos pendientes; el de antecedentes lleva más de 48 h (se marca en rojo).
  {
    id: "a0000000-0000-4000-8000-000000000001",
    usuario_id: ID_EN_REVISION,
    tipo: "dni_frente",
    estado: "pendiente",
    motivo_rechazo: null,
    created_at: hace(1),
    revisado_at: null,
    archivo_borrado_at: null,
    storage_path: `${ID_EN_REVISION}/dni_frente-1760000000001.png`,
    archivo: "dni-frente",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    usuario_id: ID_EN_REVISION,
    tipo: "antecedentes",
    estado: "pendiente",
    motivo_rechazo: null,
    created_at: hace(60),
    revisado_at: null,
    archivo_borrado_at: null,
    storage_path: `${ID_EN_REVISION}/antecedentes-1760000000002.pdf`,
    archivo: "antecedentes",
  },
  // Martín: todo aprobado (pestaña Aprobados, perfil publicado).
  {
    id: "a0000000-0000-4000-8000-000000000003",
    usuario_id: ID_PUBLICADO,
    tipo: "dni_frente",
    estado: "aprobado",
    motivo_rechazo: null,
    created_at: hace(120),
    revisado_at: hace(100),
    archivo_borrado_at: null,
    storage_path: `${ID_PUBLICADO}/dni_frente-1760000000003.png`,
    archivo: "dni-frente",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    usuario_id: ID_PUBLICADO,
    tipo: "antecedentes",
    estado: "aprobado",
    motivo_rechazo: null,
    created_at: hace(120),
    revisado_at: hace(100),
    archivo_borrado_at: null,
    storage_path: `${ID_PUBLICADO}/antecedentes-1760000000004.pdf`,
    archivo: "antecedentes",
  },
  // Diego: antecedentes rechazados (pestaña Rechazados).
  {
    id: "a0000000-0000-4000-8000-000000000005",
    usuario_id: ID_RECHAZADO,
    tipo: "antecedentes",
    estado: "rechazado",
    motivo_rechazo: "Certificado vencido (más de 90 días)",
    created_at: hace(200),
    revisado_at: hace(190),
    archivo_borrado_at: null,
    storage_path: `${ID_RECHAZADO}/antecedentes-1760000000005.pdf`,
    archivo: "antecedentes",
  },
];

// Lo que la prueba necesita leer después: decisiones y accesos (solo en memoria).
const DECISIONES = [];
const ACCESOS = [];

// --- Archivos de muestra: PNG generado en memoria (sin dependencias) y un PDF mínimo. ---

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozoPng(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const nombre = Buffer.from(tipo, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nombre, datos])));
  return Buffer.concat([longitud, nombre, datos, crc]);
}

/** PNG RGB de `ancho` x `alto`; `color(x, y)` devuelve [r, g, b]. */
function crearPng(ancho, alto, color) {
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    for (let x = 0; x < ancho; x++) {
      const [r, g, b] = color(x, y);
      fila[1 + x * 3] = r;
      fila[2 + x * 3] = g;
      fila[3 + x * 3] = b;
    }
    filas.push(fila);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera[8] = 8; // profundidad de bits
  cabecera[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozoPng("IHDR", cabecera),
    trozoPng("IDAT", zlib.deflateSync(Buffer.concat(filas))),
    trozoPng("IEND", Buffer.alloc(0)),
  ]);
}

// Una tarjeta de DNI de mentira: fondo claro, borde, foto y renglones.
const PNG_DNI = crearPng(600, 380, (x, y) => {
  const borde = x < 14 || y < 14 || x > 585 || y > 365;
  if (borde) return [70, 70, 84];
  const foto = x > 50 && x < 200 && y > 80 && y < 300;
  if (foto) return [176, 186, 200];
  const renglon = x > 230 && x < 540 && y > 110 && y < 300 && (y - 110) % 34 < 12;
  if (renglon) return [96, 96, 110];
  return [244, 238, 226];
});

const PNG_DNI_DORSO = crearPng(600, 380, (x, y) => {
  const borde = x < 14 || y < 14 || x > 585 || y > 365;
  if (borde) return [70, 70, 84];
  const franja = y > 290 && y < 330 && x % 9 < 4;
  if (franja) return [40, 40, 52];
  return [244, 238, 226];
});

function pdfMinimo(texto) {
  const contenido = `BT /F1 14 Tf 40 150 Td (${texto}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 300] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let salida = "%PDF-1.4\n";
  objetos.forEach((objeto, i) => {
    salida += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  salida += "trailer\n<< /Root 1 0 R >>\n%%EOF\n";
  return Buffer.from(salida, "latin1");
}

const PDF_ANTECEDENTES = pdfMinimo("Certificado de antecedentes (falso)");

const ARCHIVOS = {
  "dni-frente": { bytes: PNG_DNI, tipo: "image/png" },
  "dni-dorso": { bytes: PNG_DNI_DORSO, tipo: "image/png" },
  antecedentes: { bytes: PDF_ANTECEDENTES, tipo: "application/pdf" },
};

// ---------------------------------------------------------------------------------------------

function usuarioDe(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  return (m && USUARIOS[m[1]]) || null;
}

function filaPerfil(id, yo) {
  const propio = yo?.id === id;
  const base = {
    usuario_id: id,
    foto_path: null,
    barrio_id: 5,
    oficios: ["gas", "plomeria"],
    especialidades: "Instalaciones, Reparaciones",
    descripcion: "Gasista matriculado con diez años de experiencia en Mar del Plata.",
    anios_experiencia: 10,
    zonas_texto: "Centro, La Perla",
    toda_la_ciudad: false,
    disponibilidad: "Lunes a viernes",
    fotos_trabajos: [],
    identidad_verificada: true,
    antecedentes_ok: true,
    matriculado: true,
    promedio: 4.6,
    cantidad_resenas: TOTAL_RESENAS,
    nombre: "Martín",
    // Solo cliente con sesión y dueño ven el apellido; el resto, la inicial.
    apellido: yo ? "Gómez" : null,
    apellido_inicial: "G",
    es_propio: propio,
  };
  if (id === ID_PUBLICADO) return [{ ...base, publicado: true }];
  if (id === ID_EN_REVISION && propio) {
    return [
      {
        ...base,
        nombre: "Sofía",
        apellido: "Ríos",
        apellido_inicial: "R",
        publicado: false,
        cantidad_resenas: 0,
        promedio: null,
      },
    ];
  }
  return [];
}

function responder(res, estado, cuerpo, extra = {}) {
  res.writeHead(estado, { "content-type": "application/json", ...extra });
  res.end(JSON.stringify(cuerpo));
}

/**
 * Filtros de PostgREST que usa la app: `col=eq.valor` y `col=in.(a,b)`. El resto de los parámetros
 * (select, order, limit) se ignora.
 */
function filtrar(filas, url) {
  let resultado = filas;
  for (const [clave, valor] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(clave)) continue;
    const eq = /^eq\.(.*)$/.exec(valor);
    const en = /^in\.\((.*)\)$/.exec(valor);
    if (eq) {
      resultado = resultado.filter((f) => String(f[clave]) === eq[1]);
    } else if (en) {
      const lista = en[1].split(",").map((v) => v.replace(/^"|"$/g, ""));
      resultado = resultado.filter((f) => lista.includes(String(f[clave])));
    }
  }
  const orden = url.searchParams.get("order");
  if (orden === "created_at.desc") {
    resultado = [...resultado].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return resultado;
}

/** Tablas que lee el admin. Devuelve `null` si la tabla no es de este panel. */
function tablaAdmin(nombre) {
  switch (nombre) {
    case "usuarios":
      return USUARIOS_ADMIN;
    case "perfiles_profesionales":
      return PERFILES_ADMIN;
    case "matricula_propia":
      return MATRICULAS_ADMIN;
    case "verificaciones":
      return VERIFICACIONES.map(({ archivo, ...fila }) => fila);
    case "barrios":
      return BARRIOS;
    default:
      return null;
  }
}

/** Lecturas del admin. Devuelve `true` si las atendió. */
function atenderLecturaAdmin(url, res, unObjeto) {
  const nombre = url.pathname.replace(/^\/rest\/v1\//, "");
  const filas = tablaAdmin(nombre);
  if (!filas) return false;
  const resultado = filtrar(filas, url);
  if (unObjeto) {
    if (resultado.length !== 1) {
      responder(res, 406, { code: "PGRST116", message: "The result contains 0 rows" });
    } else {
      responder(res, 200, resultado[0]);
    }
    return true;
  }
  responder(res, 200, resultado);
  return true;
}

/** Sirve el archivo de muestra de un documento firmado (URL de 60 s en la app real). */
function servirDocumento(url, req, res) {
  const ruta = decodeURIComponent(
    url.pathname.replace(/^\/storage\/v1\/object\/sign\/documentos\//, ""),
  );
  const verificacion = VERIFICACIONES.find((v) => v.storage_path === ruta);
  if (!verificacion || !url.searchParams.get("token")) {
    return responder(res, 404, { message: "Object not found" });
  }
  const archivo = ARCHIVOS[verificacion.archivo];
  // Como Storage real: con `Range` responde 206 con solo ese tramo (el visor pide los primeros 16 bytes).
  const rango = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
  if (rango) {
    const desde = Number(rango[1]);
    const hasta = rango[2]
      ? Math.min(Number(rango[2]), archivo.bytes.length - 1)
      : archivo.bytes.length - 1;
    const tramo = archivo.bytes.subarray(desde, hasta + 1);
    res.writeHead(206, {
      "content-type": archivo.tipo,
      "content-length": tramo.length,
      "content-range": `bytes ${desde}-${desde + tramo.length - 1}/${archivo.bytes.length}`,
    });
    return res.end(tramo);
  }
  res.writeHead(200, { "content-type": archivo.tipo, "content-length": archivo.bytes.length });
  res.end(archivo.bytes);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PUERTO}`);
  const yo = usuarioDe(req);
  const unObjeto = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  let cuerpo = "";
  req.on("data", (c) => (cuerpo += c));
  req.on("end", () => {
    const ruta = url.pathname;

    if (ruta === "/__decisiones") return responder(res, 200, DECISIONES);
    if (ruta === "/__accesos") return responder(res, 200, ACCESOS);

    if (ruta === "/auth/v1/user") {
      if (!yo) return responder(res, 401, { message: "sin sesión" });
      return responder(res, 200, {
        id: yo.id,
        aud: "authenticated",
        role: "authenticated",
        email: `${yo.nombre.toLowerCase()}@example.com`,
      });
    }

    // Email de un profesional (lo lee el detalle con la service role).
    if (ruta.startsWith("/auth/v1/admin/users/")) {
      const id = ruta.split("/").pop();
      const usuario = USUARIOS_ADMIN.find((u) => u.id === id);
      if (!usuario) return responder(res, 404, { message: "User not found" });
      return responder(res, 200, {
        id,
        aud: "authenticated",
        email: `${usuario.nombre.toLowerCase()}@example.com`,
      });
    }

    // Documentos: firma (service role) y descarga de la URL firmada.
    if (ruta.startsWith("/storage/v1/object/sign/documentos/")) {
      if (req.method === "GET") return servirDocumento(url, req, res);
      const path = decodeURIComponent(
        ruta.replace(/^\/storage\/v1\/object\/sign\/documentos\//, ""),
      );
      if (!VERIFICACIONES.some((v) => v.storage_path === path)) {
        return responder(res, 400, { message: "Object not found" });
      }
      return responder(res, 200, {
        signedURL: `/object/sign/documentos/${path}?token=falso-${Date.now()}`,
      });
    }

    // Auditoría de accesos: la service role inserta una fila por cada URL firmada.
    if (ruta === "/rest/v1/accesos_documentos") {
      if (req.method === "POST") {
        ACCESOS.push(JSON.parse(cuerpo || "{}"));
        res.writeHead(201);
        return res.end();
      }
      return responder(res, 200, ACCESOS);
    }

    // Decisión del admin: el falso registra el pedido y responde como la función de la base.
    if (ruta === "/rest/v1/rpc/decidir_documento") {
      if (yo?.rol !== "admin")
        return responder(res, 403, { code: "42501", message: "permission denied" });
      const pedido = JSON.parse(cuerpo || "{}");
      DECISIONES.push(pedido);
      const verificacion = VERIFICACIONES.find((v) => v.id === pedido.p_verificacion);
      if (!verificacion) return responder(res, 400, { code: "P0002", message: "no encontrada" });
      if (verificacion.estado !== "pendiente") {
        return responder(res, 400, { code: "P0001", message: "ya decidido" });
      }
      return responder(res, 200, [
        {
          r_usuario_id: verificacion.usuario_id,
          r_tipo: verificacion.tipo,
          r_estado: pedido.p_aprobar ? "aprobado" : "rechazado",
        },
      ]);
    }

    if (yo?.rol === "admin" && ruta.startsWith("/rest/v1/") && req.method === "GET") {
      if (atenderLecturaAdmin(url, res, unObjeto)) return;
    }

    if (ruta === "/rest/v1/rpc/perfil_profesional") {
      const { p_id: id } = JSON.parse(cuerpo || "{}");
      return responder(res, 200, filaPerfil(id, yo));
    }
    if (ruta === "/rest/v1/rpc/distancia_km") return responder(res, 200, 1.2);

    if (ruta === "/rest/v1/resenas") {
      const vacio = (url.searchParams.get("profesional_id") ?? "").includes(ID_EN_REVISION);
      const desde = Number(url.searchParams.get("offset") ?? 0);
      const limite = Number(url.searchParams.get("limit") ?? TOTAL_RESENAS);
      const pagina = vacio ? [] : resenas.slice(desde, desde + limite);
      return responder(res, 200, pagina, {
        "content-range": `${pagina.length ? desde : "*"}${pagina.length ? `-${desde + pagina.length - 1}` : ""}/${vacio ? 0 : TOTAL_RESENAS}`,
      });
    }
    if (ruta === "/rest/v1/usuarios_publicos") {
      return responder(res, 200, [{ id: ID_CLIENTE, nombre: "Laura", apellido_inicial: "F" }]);
    }
    if (ruta === "/rest/v1/usuarios") {
      if (!yo)
        return unObjeto ? responder(res, 406, { message: "sin filas" }) : responder(res, 200, []);
      const fila = {
        rol: yo.rol,
        estado: "activa",
        nombre: yo.nombre,
        apellido: yo.apellido,
        normas_version: "2026-10",
        barrio_id: yo.barrio_id,
      };
      return responder(res, 200, unObjeto ? fila : [fila]);
    }
    if (ruta === "/rest/v1/perfiles_profesionales") {
      if (req.method === "PATCH") return responder(res, 200, [{ usuario_id: yo?.id }]);
      const fila = {
        oficios: ["gas"],
        especialidades: "Instalaciones",
        descripcion: "Gasista matriculado.",
        anios_experiencia: 10,
        disponibilidad: "Lunes a viernes",
        toda_la_ciudad: false,
        zonas: [1],
      };
      return responder(res, 200, unObjeto ? fila : [fila]);
    }
    if (ruta === "/rest/v1/barrios") {
      return responder(res, 200, [
        { id: 1, nombre: "Centro" },
        { id: 2, nombre: "La Perla" },
        { id: 3, nombre: "Güemes" },
      ]);
    }
    // Cualquier otra cosa (vistas, métricas): vacío.
    return responder(res, 200, unObjeto ? {} : []);
  });
});

server.listen(PUERTO, () => {
  process.stdout.write(`Supabase falso en http://localhost:${PUERTO}\n`);
});
