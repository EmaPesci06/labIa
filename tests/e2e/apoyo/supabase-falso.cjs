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
// Clientes para los errores de contacto (LAB-25). Cada token tiene su propio usuario: así las pruebas
// no comparten estado (el límite diario se simula por token, no con un contador global).
const ID_CLIENTE_LIMITE = "66666666-6666-4666-8666-666666666666";
const ID_CLIENTE_DESPUBLICADO = "77777777-7777-4777-8777-777777777777";
// LAB-32: profesional que se modera (suspensión, reseñas bajas). Sus datos son propios de la moderación.
const ID_MODERADO = "99999999-9999-4999-8999-999999999999";

// LAB-31 (reseñas): clientes para el flujo de reseñas. Los tres primeros contactaron a ID_PUBLICADO
// (contactos falsos); ID_RESENA_AJENA no contactó a nadie y no puede reseñar.
const ID_RESENA_NUEVA = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ID_RESENA_EDITABLE = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const ID_RESENA_VENCIDA = "aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const ID_RESENA_AJENA = "aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const CONTACTARON_A_PUBLICADO = new Set([ID_RESENA_NUEVA, ID_RESENA_EDITABLE, ID_RESENA_VENCIDA]);

// token -> usuario
const USUARIOS = {
  "tok-cliente": {
    id: ID_CLIENTE,
    rol: "cliente",
    nombre: "Laura",
    apellido: "Fernández",
    barrio_id: 1,
  },
  "tok-cliente-limite": {
    id: ID_CLIENTE_LIMITE,
    rol: "cliente",
    nombre: "Ana",
    apellido: "Pérez",
    barrio_id: 1,
  },
  "tok-cliente-despublicado": {
    id: ID_CLIENTE_DESPUBLICADO,
    rol: "cliente",
    nombre: "Bruno",
    apellido: "Dávila",
    barrio_id: 1,
  },
  "tok-resena-nueva": {
    id: ID_RESENA_NUEVA,
    rol: "cliente",
    nombre: "Julia",
    apellido: "Ruiz",
    barrio_id: 1,
  },
  "tok-resena-editable": {
    id: ID_RESENA_EDITABLE,
    rol: "cliente",
    nombre: "Diego",
    apellido: "Soto",
    barrio_id: 1,
  },
  "tok-resena-vencida": {
    id: ID_RESENA_VENCIDA,
    rol: "cliente",
    nombre: "Mora",
    apellido: "Vidal",
    barrio_id: 1,
  },
  "tok-resena-ajena": {
    id: ID_RESENA_AJENA,
    rol: "cliente",
    nombre: "Nico",
    apellido: "Lago",
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
  "tok-moderado": {
    id: ID_MODERADO,
    rol: "profesional",
    nombre: "Tomás",
    apellido: "Ruiz",
    barrio_id: 3,
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
// Número de prueba: solo debe aparecer en la respuesta de la acción, nunca en el HTML del perfil.
const WHATSAPP_FALSO = "5492235550123";
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
// Reseñas previas de los clientes de prueba (LAB-31): una editable (hace 2 h) y una vencida (hace 30 h).
resenas.unshift(
  {
    id: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    autor_id: ID_RESENA_EDITABLE,
    profesional_id: ID_PUBLICADO,
    puntaje: 3,
    texto: "Llegó a horario, el resultado estuvo bien.",
    created_at: hace(2),
  },
  {
    id: "bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    autor_id: ID_RESENA_VENCIDA,
    profesional_id: ID_PUBLICADO,
    puntaje: 4,
    texto: "Buen trabajo.",
    created_at: hace(30),
  },
);

const RESENAS_INICIALES = resenas.map((r) => ({ ...r }));

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
  {
    id: ID_CLIENTE_LIMITE,
    rol: "cliente",
    estado: "activa",
    nombre: "Ana",
    apellido: "Pérez",
    whatsapp: null,
    barrio_id: 1,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(120),
  },
  {
    id: ID_CLIENTE_DESPUBLICADO,
    rol: "cliente",
    estado: "activa",
    nombre: "Bruno",
    apellido: "Dávila",
    whatsapp: null,
    barrio_id: 1,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(120),
  },
  {
    id: ID_MODERADO,
    rol: "profesional",
    estado: "activa",
    nombre: "Tomás",
    apellido: "Ruiz",
    whatsapp: "+5492236000004",
    barrio_id: 3,
    normas_version: "2026-10",
    normas_aceptadas_at: hace(150),
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

// Trabajos y postulaciones para LAB-27 y LAB-29.
const TRABAJOS_MOCK = [
  {
    id: "88888888-8888-4888-8888-888888888881",
    oficio: "gas",
    titulo: "Olor a gas en la cocina",
    descripcion: "Desde ayer hay olor cerca del horno. Ya cerré la llave de paso.",
    urgencia: "lo_antes_posible",
    presupuesto_estimado: null,
    fotos: [],
    barrio_id: 2,
    barrio_nombre: "La Perla",
    distancia_km: 0.8,
    cantidad_postulaciones: 2,
    ya_me_postule: false,
    estado: "abierto",
    cliente_id: ID_CLIENTE,
    profesional_elegido_id: null,
    created_at: hace(20),
    cliente_nombre: "Carlos",
    cliente_apellido_inicial: "M",
    total: 2,
  },
  {
    id: "88888888-8888-4888-8888-888888888882",
    oficio: "plomeria",
    titulo: "Cambiar canilla del baño",
    descripcion: "Gotea aunque esté cerrada. Tengo la canilla nueva.",
    urgencia: "esta_semana",
    presupuesto_estimado: 12000,
    fotos: [],
    barrio_id: 1,
    barrio_nombre: "Centro",
    distancia_km: 2.1,
    cantidad_postulaciones: 1,
    ya_me_postule: true,
    estado: "abierto",
    cliente_id: ID_CLIENTE,
    profesional_elegido_id: null,
    created_at: hace(120),
    cliente_nombre: "Lucía",
    cliente_apellido_inicial: "P",
    total: 2,
  },
  // LAB-31: trabajo terminado de la clienta de prueba que ya contrató a ID_PUBLICADO (solo lo ve ella).
  {
    id: "88888888-8888-4888-8888-888888888891",
    oficio: "pintura",
    titulo: "Pintar el living",
    descripcion: "Living y pasillo, dos manos de látex.",
    urgencia: "esta_semana",
    presupuesto_estimado: 85000,
    fotos: [],
    barrio_id: 1,
    barrio_nombre: "Centro",
    distancia_km: 1.1,
    cantidad_postulaciones: 1,
    ya_me_postule: false,
    estado: "cerrado",
    cliente_id: ID_RESENA_NUEVA,
    profesional_elegido_id: ID_PUBLICADO,
    created_at: hace(200),
    cliente_nombre: "Julia",
    cliente_apellido_inicial: "R",
    total: 1,
    soloPara: ID_RESENA_NUEVA,
  },
];

const POSTULACIONES_MOCK = [
  {
    id: "99999999-9999-4999-9999-999999999991",
    trabajo_id: "88888888-8888-4888-8888-888888888882",
    profesional_id: ID_PUBLICADO,
    mensaje: "Puedo pasar hoy a la tarde a revisar.",
    precio_estimado: 15000,
    sena_propuesta: 3000,
    estado: "enviada",
    created_at: hace(90),
    trabajos: {
      id: "88888888-8888-4888-8888-888888888882",
      titulo: "Cambiar canilla del baño",
      descripcion: "Gotea aunque esté cerrada.",
      oficio: "plomeria",
      urgencia: "esta_semana",
      barrio_id: 1,
      estado: "abierto",
      cliente_id: ID_CLIENTE,
      barrios: { nombre: "Centro" },
    },
  },
  {
    id: "99999999-9999-4999-9999-999999999992",
    trabajo_id: "88888888-8888-4888-8888-888888888881",
    profesional_id: ID_PUBLICADO,
    mensaje: "Puedo ir hoy a las 17 h. Reviso la pérdida y te paso presupuesto en el momento.",
    precio_estimado: 40000,
    sena_propuesta: 10000,
    estado: "enviada",
    created_at: hace(15),
    trabajos: {
      id: "88888888-8888-4888-8888-888888888881",
      titulo: "Olor a gas en la cocina",
      descripcion: "Desde ayer hay olor cerca del horno.",
      oficio: "gas",
      urgencia: "lo_antes_posible",
      barrio_id: 2,
      estado: "abierto",
      cliente_id: ID_CLIENTE,
      barrios: { nombre: "La Perla" },
    },
  },
  {
    id: "99999999-9999-4999-9999-999999999993",
    trabajo_id: "88888888-8888-4888-8888-888888888881",
    profesional_id: ID_RECHAZADO,
    mensaje: "Mañana a primera hora estoy por La Perla. Llevo detector de pérdidas.",
    precio_estimado: 38000,
    sena_propuesta: null,
    estado: "enviada",
    created_at: hace(10),
    trabajos: {
      id: "88888888-8888-4888-8888-888888888881",
      titulo: "Olor a gas en la cocina",
      descripcion: "Desde ayer hay olor cerca del horno.",
      oficio: "gas",
      urgencia: "lo_antes_posible",
      barrio_id: 2,
      estado: "abierto",
      cliente_id: ID_CLIENTE,
      barrios: { nombre: "La Perla" },
    },
  },
];

// Lo que la prueba necesita leer después: decisiones y accesos (solo en memoria).
const DECISIONES = [];
const ACCESOS = [];
// Estado inicial de trabajos y postulaciones: `/__reiniciar` vuelve a él (LAB-50).
const TRABAJOS_INICIALES = structuredClone(TRABAJOS_MOCK);
const POSTULACIONES_INICIALES = structuredClone(POSTULACIONES_MOCK);

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
  if (id === ID_MODERADO) {
    return [
      {
        ...base,
        nombre: "Tomás",
        apellido: yo ? "Ruiz" : null,
        apellido_inicial: "R",
        publicado: true,
        cantidad_resenas: 2,
        promedio: 1.5,
      },
    ];
  }
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
    const menor = /^lte\.(.*)$/.exec(valor);
    if (menor) {
      resultado = resultado.filter((f) => Number(f[clave]) <= Number(menor[1]));
      continue;
    }
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
      return USUARIOS_ADMIN.map((u) => ({ ...u, estado: estadoDe(u.id) }));
    case "perfiles_profesionales":
      return PERFILES_ADMIN;
    case "matricula_propia":
      return MATRICULAS_ADMIN;
    case "verificaciones":
      return VERIFICACIONES.map(({ archivo, ...fila }) => fila);
    case "barrios":
      return BARRIOS;
    case "reportes":
      return MODERACION.reportes;
    case "trabajos":
      return TRABAJOS_MOCK.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        cliente_id: t.cliente_id,
        estado: MODERACION.trabajosCerrados.has(t.id) ? "cancelado" : t.estado,
      }));
    case "resenas":
      return todasLasResenas().map((r) => ({
        id: r.id,
        autor_id: r.autor_id,
        profesional_id: r.profesional_id ?? ID_PUBLICADO,
        puntaje: r.puntaje,
        texto: r.texto,
        created_at: r.created_at,
      }));
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

// ---------------------------------------------------------------------------------------------
// LAB-32: reportes y moderación. Estado solo en memoria; /__moderacion/reiniciar lo vuelve a los datos
// de partida. Las RPC de moderación exigen rol admin (como la base) y la reseña ocultada se borra.
// ---------------------------------------------------------------------------------------------

const crypto = require("node:crypto");

const RESENAS_MODERACION_BASE = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    autor_id: ID_CLIENTE_DESPUBLICADO,
    profesional_id: ID_MODERADO,
    puntaje: 1,
    texto: "Llegó tarde y dejó todo sin limpiar.",
    created_at: hace(5),
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    autor_id: ID_CLIENTE_LIMITE,
    profesional_id: ID_MODERADO,
    puntaje: 2,
    texto: "Cambió el presupuesto sin avisarme.",
    created_at: hace(7),
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    autor_id: ID_CLIENTE,
    profesional_id: ID_MODERADO,
    puntaje: 1,
    texto: "Presupuesto inflado y trato agresivo.",
    created_at: hace(9),
  },
];

const REPORTES_BASE = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    autor_id: ID_CLIENTE_LIMITE,
    objetivo_tipo: "perfil",
    objetivo_id: ID_MODERADO,
    motivo: "estafa",
    detalle: "Me pidió una seña por transferencia fuera de la app.",
    estado: "abierto",
    resuelto_por: null,
    created_at: hace(3),
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    autor_id: ID_CLIENTE_DESPUBLICADO,
    objetivo_tipo: "resena",
    objetivo_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    motivo: "contenido_inapropiado",
    detalle: null,
    estado: "abierto",
    resuelto_por: null,
    created_at: hace(2),
  },
];

let MODERACION;

function reiniciarModeracion() {
  MODERACION = {
    reportes: REPORTES_BASE.map((r) => ({ ...r })),
    resenas: RESENAS_MODERACION_BASE.map((r) => ({ ...r })),
    ocultas: new Set(),
    suspendidos: new Map(),
    trabajosCerrados: new Set(),
  };
}
reiniciarModeracion();

function estadoDe(id) {
  return MODERACION.suspendidos.has(id) ? "suspendida" : "activa";
}

/** Reseñas visibles: las de partida y las de moderación, sin las que se ocultaron (se borran). */
function todasLasResenas() {
  return [...resenas, ...MODERACION.resenas].filter((r) => !MODERACION.ocultas.has(r.id));
}

const RPC_ADMIN = new Set([
  "marcar_reporte_en_revision",
  "resolver_reporte",
  "ocultar_resena_admin",
  "cerrar_trabajo_admin",
  "suspender_cuenta_admin",
  "reactivar_cuenta_admin",
]);

function errorRpc(res, estado, codigo, mensaje) {
  responder(res, estado, { code: codigo, message: mensaje });
  return true;
}

function atenderResenas(url, res, unObjeto) {
  const idParam = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
  if (idParam) {
    const resena = todasLasResenas().find((r) => r.id === idParam);
    if (!resena) return errorRpc(res, 406, "PGRST116", "The result contains 0 rows");
    responder(res, 200, unObjeto ? resena : [resena]);
    return true;
  }
  const profesional = (url.searchParams.get("profesional_id") ?? "").replace(/^eq\./, "");
  const candidatas = todasLasResenas().filter(
    (r) => !profesional || (r.profesional_id ?? ID_PUBLICADO) === profesional,
  );
  const desde = Number(url.searchParams.get("offset") ?? 0);
  const limite = Number(url.searchParams.get("limit") ?? TOTAL_RESENAS);
  const pagina = candidatas.slice(desde, desde + limite);
  responder(res, 200, pagina, {
    "content-range": `${pagina.length ? desde : "*"}${pagina.length ? `-${desde + pagina.length - 1}` : ""}/${candidatas.length}`,
  });
  return true;
}

function atenderReportes(req, url, cuerpo, yo, unObjeto, res) {
  if (req.method === "POST") {
    const datos = JSON.parse(cuerpo || "{}");
    const duplicado = MODERACION.reportes.some(
      (r) =>
        r.autor_id === datos.autor_id &&
        r.objetivo_tipo === datos.objetivo_tipo &&
        r.objetivo_id === datos.objetivo_id,
    );
    if (duplicado) {
      responder(res, 409, { code: "23505", message: "duplicate key value" });
      return true;
    }
    MODERACION.reportes.push({
      id: crypto.randomUUID(),
      estado: "abierto",
      resuelto_por: null,
      detalle: null,
      created_at: new Date().toISOString(),
      ...datos,
    });
    res.writeHead(201);
    res.end();
    return true;
  }
  // Lectura de quien reporta: solo sus propios reportes (la comprobación de duplicados).
  const filas = filtrar(
    MODERACION.reportes.filter((r) => yo && r.autor_id === yo.id),
    url,
  );
  if (!unObjeto) {
    responder(res, 200, filas);
  } else if (filas.length === 1) {
    responder(res, 200, filas[0]);
  } else {
    errorRpc(res, 406, "PGRST116", "The result contains 0 rows");
  }
  return true;
}

function atenderRpcAdmin(nombre, cuerpo, yo, res) {
  if (yo?.rol !== "admin") return errorRpc(res, 403, "42501", "permission denied");
  const p = JSON.parse(cuerpo || "{}");
  const reporte = () => MODERACION.reportes.find((r) => r.id === p.p_reporte_id);

  switch (nombre) {
    case "marcar_reporte_en_revision": {
      if (!reporte()) return errorRpc(res, 400, "P0002", "Reporte no encontrado");
      if (reporte().estado === "abierto") reporte().estado = "en_revision";
      break;
    }
    case "resolver_reporte": {
      if (!reporte()) return errorRpc(res, 400, "P0002", "Reporte no encontrado");
      reporte().estado = "resuelto";
      reporte().resuelto_por = yo.id;
      break;
    }
    case "ocultar_resena_admin": {
      if (!todasLasResenas().some((r) => r.id === p.p_resena_id)) {
        return errorRpc(res, 400, "P0002", "Reseña no encontrada");
      }
      // Como la función real: la reseña se borra, no queda visible para nadie.
      MODERACION.ocultas.add(p.p_resena_id);
      break;
    }
    case "cerrar_trabajo_admin": {
      if (!TRABAJOS_MOCK.some((t) => t.id === p.p_trabajo_id)) {
        return errorRpc(res, 400, "P0002", "Trabajo no encontrado");
      }
      MODERACION.trabajosCerrados.add(p.p_trabajo_id);
      break;
    }
    case "suspender_cuenta_admin": {
      const usuario = USUARIOS_ADMIN.find((u) => u.id === p.p_usuario_id);
      if (!usuario) return errorRpc(res, 400, "P0002", "Usuario no encontrado");
      if (usuario.rol === "admin") {
        return errorRpc(res, 400, "22023", "No se puede suspender a un admin");
      }
      if (!p.p_motivo) return errorRpc(res, 400, "22023", "El motivo de suspensión es obligatorio");
      MODERACION.suspendidos.set(usuario.id, p.p_motivo);
      break;
    }
    case "reactivar_cuenta_admin": {
      if (!USUARIOS_ADMIN.some((u) => u.id === p.p_usuario_id)) {
        return errorRpc(res, 400, "P0002", "Usuario no encontrado");
      }
      MODERACION.suspendidos.delete(p.p_usuario_id);
      break;
    }
  }
  responder(res, 200, null);
  return true;
}

/** Atiende las rutas de moderación. Devuelve `true` si las respondió. */
function atenderModeracion(ruta, url, req, res, cuerpo, yo, unObjeto) {
  if (ruta === "/rest/v1/resenas" && req.method === "GET") {
    return atenderResenas(url, res, unObjeto);
  }
  if (ruta === "/rest/v1/reportes") {
    return atenderReportes(req, url, cuerpo, yo, unObjeto, res);
  }
  if (ruta === "/rest/v1/rpc/mi_motivo_suspension") {
    responder(res, 200, (yo && MODERACION.suspendidos.get(yo.id)) ?? null);
    return true;
  }
  if (ruta === "/rest/v1/rpc/revocar_sesiones_admin") {
    responder(res, 200, null);
    return true;
  }
  if (!ruta.startsWith("/rest/v1/rpc/")) return false;
  const nombre = ruta.replace("/rest/v1/rpc/", "");
  if (!RPC_ADMIN.has(nombre)) return false;
  return atenderRpcAdmin(nombre, cuerpo, yo, res);
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
    if (ruta === "/__moderacion/reiniciar") {
      reiniciarModeracion();
      return responder(res, 200, { ok: true });
    }
    if (ruta === "/__accesos") return responder(res, 200, ACCESOS);
    // Vuelve las reseñas, los trabajos y las postulaciones al estado inicial (las altas, ediciones y
    // cambios de estado quedan en memoria). Trabajos y postulaciones: LAB-50.
    if (ruta === "/__reiniciar") {
      resenas.splice(0, resenas.length, ...RESENAS_INICIALES.map((r) => ({ ...r })));
      TRABAJOS_MOCK.splice(0, TRABAJOS_MOCK.length, ...structuredClone(TRABAJOS_INICIALES));
      POSTULACIONES_MOCK.splice(
        0,
        POSTULACIONES_MOCK.length,
        ...structuredClone(POSTULACIONES_INICIALES),
      );
      return responder(res, 200, { ok: true });
    }

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

    if (atenderModeracion(ruta, url, req, res, cuerpo, yo, unObjeto)) return;

    if (ruta === "/rest/v1/rpc/perfil_profesional") {
      const { p_id: id } = JSON.parse(cuerpo || "{}");
      return responder(res, 200, filaPerfil(id, yo));
    }
    if (ruta === "/rest/v1/rpc/distancia_km") return responder(res, 200, 1.2);

    // LAB-29: RPCs de elección, cambio y estado de trabajos del cliente.
    if (ruta === "/rest/v1/rpc/elegir_postulante") {
      const { p_postulacion_id } = JSON.parse(cuerpo || "{}");
      const post = POSTULACIONES_MOCK.find((p) => p.id === p_postulacion_id);
      if (!post) return responder(res, 404, { message: "postulacion no encontrada" });
      const trab = TRABAJOS_MOCK.find((t) => t.id === post.trabajo_id);
      if (!trab || trab.estado !== "abierto") {
        return responder(res, 400, { code: "22023", message: "El trabajo ya no está abierto" });
      }
      trab.estado = "asignado";
      trab.profesional_elegido_id = post.profesional_id;
      for (const p of POSTULACIONES_MOCK) {
        if (p.trabajo_id === trab.id) {
          p.estado = p.id === post.id ? "elegida" : "descartada";
        }
      }
      return responder(res, 200, post.profesional_id);
    }
    // LAB-44: el profesional retira su postulación solo por la función (ya no por PATCH directo).
    if (ruta === "/rest/v1/rpc/retirar_postulacion") {
      const { p_postulacion_id } = JSON.parse(cuerpo || "{}");
      const post = POSTULACIONES_MOCK.find((p) => p.id === p_postulacion_id);
      if (!post)
        return responder(res, 400, { code: "P0002", message: "Postulación no encontrada" });
      if (post.estado !== "enviada") {
        return responder(res, 400, {
          code: "22023",
          message: "Solo podés retirar una postulación que sigue enviada",
        });
      }
      post.estado = "retirada";
      return responder(res, 200, true);
    }
    if (ruta === "/rest/v1/rpc/cambiar_profesional") {
      const { p_trabajo_id } = JSON.parse(cuerpo || "{}");
      const trab = TRABAJOS_MOCK.find((t) => t.id === p_trabajo_id);
      if (!trab) return responder(res, 404, { message: "trabajo no encontrado" });
      trab.estado = "abierto";
      trab.profesional_elegido_id = null;
      for (const p of POSTULACIONES_MOCK) {
        if (p.trabajo_id === trab.id) {
          if (p.estado === "elegida") p.estado = "descartada";
          else if (p.estado === "descartada") p.estado = "enviada";
        }
      }
      return responder(res, 200, true);
    }
    if (ruta === "/rest/v1/rpc/marcar_trabajo_terminado") {
      const { p_trabajo_id } = JSON.parse(cuerpo || "{}");
      const trab = TRABAJOS_MOCK.find((t) => t.id === p_trabajo_id);
      if (!trab) return responder(res, 404, { message: "trabajo no encontrado" });
      trab.estado = "cerrado";
      return responder(res, 200, true);
    }
    if (ruta === "/rest/v1/rpc/cancelar_trabajo") {
      const { p_trabajo_id } = JSON.parse(cuerpo || "{}");
      const trab = TRABAJOS_MOCK.find((t) => t.id === p_trabajo_id);
      if (!trab) return responder(res, 404, { message: "trabajo no encontrado" });
      trab.estado = "cancelado";
      return responder(res, 200, true);
    }

    // LAB-25 y LAB-29: registra el contacto y devuelve el WhatsApp (E.164 sin "+").
    if (ruta === "/rest/v1/rpc/contactar_profesional") {
      const { p_profesional: id, origen } = JSON.parse(cuerpo || "{}");
      if (!yo || yo.rol !== "cliente") {
        return responder(res, 403, {
          code: "42501",
          message: "Necesitás una cuenta de cliente activa para contactar",
        });
      }
      // Límite diario simulado para este cliente: la función real devuelve 53400.
      if (yo.id === ID_CLIENTE_LIMITE) {
        return responder(res, 400, {
          code: "53400",
          message: "Llegaste al máximo de contactos por hoy. Probá mañana.",
        });
      }
      if (origen === "postulacion") {
        return responder(res, 200, WHATSAPP_FALSO);
      }
      // Profesional que dejó de estar disponible entre que se abrió la hoja y se confirmó.
      if (yo.id === ID_CLIENTE_DESPUBLICADO) {
        return responder(res, 404, {
          code: "P0002",
          message: "Ese profesional no está disponible",
        });
      }
      if (id !== ID_PUBLICADO) {
        return responder(res, 404, {
          code: "P0002",
          message: "Ese profesional no está disponible",
        });
      }
      return responder(res, 200, WHATSAPP_FALSO);
    }

    if (ruta === "/rest/v1/resenas") {
      // Las altas, ediciones y la reseña propia se guardan en memoria (se pierden al reiniciar el falso).
      if (req.method === "POST") {
        const datos = JSON.parse(cuerpo || "{}");
        const nueva = {
          id: `res-nueva-${Date.now()}`,
          autor_id: yo?.id ?? ID_CLIENTE,
          profesional_id: datos.profesional_id,
          trabajo_id: datos.trabajo_id || null,
          puntaje: datos.puntaje,
          texto: datos.texto || null,
          created_at: new Date().toISOString(),
        };
        resenas.unshift(nueva);
        return responder(res, 201, unObjeto ? nueva : [nueva]);
      }
      if (req.method === "PATCH") {
        const datos = JSON.parse(cuerpo || "{}");
        const idParam = (url.searchParams.get("id") ?? "").replace("eq.", "");
        const fila = resenas.find((r) => r.id === idParam);
        if (fila) Object.assign(fila, datos);
        return responder(res, 200, unObjeto ? datos : [datos]);
      }
      const autorParam = (url.searchParams.get("autor_id") ?? "").replace("eq.", "");
      if (autorParam) {
        const propia = resenas.find(
          (r) => r.autor_id === autorParam && (r.profesional_id ?? ID_PUBLICADO) === ID_PUBLICADO,
        );
        if (!propia) {
          return unObjeto ? responder(res, 406, { message: "sin filas" }) : responder(res, 200, []);
        }
        return responder(res, 200, unObjeto ? propia : [propia]);
      }
      const vacio = (url.searchParams.get("profesional_id") ?? "").includes(ID_EN_REVISION);
      const desde = Number(url.searchParams.get("offset") ?? 0);
      const limite = Number(url.searchParams.get("limit") ?? resenas.length);
      const pagina = vacio ? [] : resenas.slice(desde, desde + limite);
      return responder(res, 200, pagina, {
        "content-range": `${pagina.length ? desde : "*"}${pagina.length ? `-${desde + pagina.length - 1}` : ""}/${vacio ? 0 : resenas.length}`,
      });
    }

    // Contactos registrados (LAB-31): solo los clientes de prueba que contactaron a ID_PUBLICADO.
    if (ruta === "/rest/v1/contactos") {
      const contacto =
        yo &&
        CONTACTARON_A_PUBLICADO.has(yo.id) &&
        (url.searchParams.get("profesional_id") ?? "").includes(ID_PUBLICADO);
      if (!contacto)
        return unObjeto ? responder(res, 406, { message: "sin filas" }) : responder(res, 200, []);
      const fila = { id: `contacto-${yo.id.slice(0, 8)}` };
      return responder(res, 200, unObjeto ? fila : [fila]);
    }
    if (ruta === "/rest/v1/usuarios_publicos") {
      const idParam = url.searchParams.get("id");
      if (idParam && idParam.startsWith("in.")) {
        const ids = idParam.replace("in.(", "").replace(")", "").split(",");
        const encontrados = USUARIOS_ADMIN.filter((u) => ids.includes(u.id)).map((u) => ({
          id: u.id,
          nombre: u.nombre,
          apellido_inicial: u.apellido ? u.apellido[0] : "",
          foto_path: null,
          barrio_id: u.barrio_id,
        }));
        return responder(res, 200, encontrados);
      }
      const cli = {
        id: ID_CLIENTE,
        nombre: "Laura",
        apellido_inicial: "F",
        foto_path: null,
        barrio_id: 1,
      };
      return responder(res, 200, unObjeto ? cli : [cli]);
    }
    if (ruta === "/rest/v1/rpc/distancia_km") {
      return responder(res, 200, 0.8);
    }
    if (ruta === "/rest/v1/usuarios") {
      if (!yo)
        return unObjeto ? responder(res, 406, { message: "sin filas" }) : responder(res, 200, []);
      const fila = {
        rol: yo.rol,
        estado: estadoDe(yo.id),
        nombre: yo.nombre,
        apellido: yo.apellido,
        normas_version: "2026-10",
        barrio_id: yo.barrio_id,
      };
      return responder(res, 200, unObjeto ? fila : [fila]);
    }
    if (ruta.startsWith("/rest/v1/trabajos")) {
      if (req.method === "POST") {
        const datos = JSON.parse(cuerpo || "{}");
        const id = "88888888-8888-4888-8888-88888888888" + (TRABAJOS_MOCK.length + 1);
        const nuevo = {
          id,
          oficio: datos.oficio,
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          urgencia: datos.urgencia,
          presupuesto_estimado: datos.presupuesto_estimado ?? null,
          fotos: datos.fotos ?? [],
          barrio_id: datos.barrio_id,
          barrio_nombre: "Centro",
          distancia_km: 1.0,
          cantidad_postulaciones: 0,
          ya_me_postule: false,
          estado: "abierto",
          cliente_id: yo?.id ?? ID_CLIENTE,
          profesional_elegido_id: null,
          created_at: new Date().toISOString(),
          cliente_nombre: yo?.nombre ?? "Cliente",
          cliente_apellido_inicial: yo?.apellido ? yo.apellido[0] : "C",
          total: TRABAJOS_MOCK.length + 1,
        };
        TRABAJOS_MOCK.unshift(nuevo);
        return responder(res, 201, unObjeto ? nuevo : [nuevo]);
      }
      const tid = url.searchParams.get("id");
      if (tid && tid.startsWith("eq.")) {
        const idBuscado = tid.replace("eq.", "");
        const t = TRABAJOS_MOCK.find((x) => x.id === idBuscado);
        if (!t) return responder(res, 404, { message: "sin filas" });
        const fila = {
          id: t.id,
          oficio: t.oficio,
          titulo: t.titulo,
          descripcion: t.descripcion,
          urgencia: t.urgencia,
          presupuesto_estimado: t.presupuesto_estimado,
          fotos: t.fotos ?? [],
          barrio_id: t.barrio_id,
          estado: t.estado || "abierto",
          profesional_elegido_id: t.profesional_elegido_id || null,
          created_at: t.created_at,
          cliente_id: t.cliente_id || ID_CLIENTE,
          barrios: { nombre: t.barrio_nombre },
        };
        return responder(res, 200, unObjeto ? fila : [fila]);
      }

      // Consulta de elegibilidad para reseñar (postulaciones!inner con estado elegida): el falso no
      // modela postulaciones elegidas, así que nadie queda elegible por esta vía.
      if (url.searchParams.has("postulaciones.estado")) {
        return unObjeto ? responder(res, 406, { message: "sin filas" }) : responder(res, 200, []);
      }
      let lista = TRABAJOS_MOCK.filter((t) => !t.soloPara || t.soloPara === yo?.id);
      const estadoParam = url.searchParams.get("estado");
      if (estadoParam) {
        if (estadoParam.startsWith("eq.")) {
          const est = estadoParam.replace("eq.", "");
          lista = lista.filter((t) => (t.estado || "abierto") === est);
        } else if (estadoParam.startsWith("in.")) {
          const estados = estadoParam.replace("in.(", "").replace(")", "").split(",");
          lista = lista.filter((t) => estados.includes(t.estado || "abierto"));
        }
      }

      const filas = lista.map((t) => ({
        id: t.id,
        oficio: t.oficio,
        titulo: t.titulo,
        descripcion: t.descripcion,
        urgencia: t.urgencia,
        presupuesto_estimado: t.presupuesto_estimado,
        fotos: t.fotos ?? [],
        barrio_id: t.barrio_id,
        estado: t.estado || "abierto",
        profesional_elegido_id: t.profesional_elegido_id || null,
        cantidad_postulaciones: POSTULACIONES_MOCK.filter(
          (p) => p.trabajo_id === t.id && p.estado !== "retirada",
        ).length,
        created_at: t.created_at,
        cliente_id: t.cliente_id || ID_CLIENTE,
        barrios: { nombre: t.barrio_nombre },
      }));

      return responder(res, 200, unObjeto ? filas[0] : filas);
    }
    if (ruta === "/rest/v1/rpc/trabajos_para_mi") {
      const { p_oficio } = JSON.parse(cuerpo || "{}");
      let lista = TRABAJOS_MOCK.filter((t) => !t.soloPara || t.soloPara === yo?.id);
      if (p_oficio) {
        lista = lista.filter((t) => t.oficio === p_oficio);
      }
      return responder(res, 200, lista);
    }
    if (ruta.startsWith("/rest/v1/postulaciones")) {
      if (req.method === "POST") {
        const datos = JSON.parse(cuerpo || "{}");
        const id = "99999999-9999-4999-9999-99999999999" + (POSTULACIONES_MOCK.length + 1);
        const nueva = {
          id,
          trabajo_id: datos.trabajo_id,
          profesional_id: yo?.id ?? ID_PUBLICADO,
          mensaje: datos.mensaje,
          precio_estimado: datos.precio_estimado ?? null,
          sena_propuesta: datos.sena_propuesta ?? null,
          estado: "enviada",
          created_at: new Date().toISOString(),
        };
        POSTULACIONES_MOCK.unshift(nueva);
        const targetTrabajo = TRABAJOS_MOCK.find((t) => t.id === datos.trabajo_id);
        if (targetTrabajo) {
          targetTrabajo.ya_me_postule = true;
          targetTrabajo.cantidad_postulaciones = (targetTrabajo.cantidad_postulaciones || 0) + 1;
        }
        return responder(res, 201, unObjeto ? nueva : [nueva]);
      }
      let lista = POSTULACIONES_MOCK;
      const tid = url.searchParams.get("trabajo_id");
      if (tid) {
        const idBuscado = tid.replace("eq.", "");
        lista = lista.filter((p) => p.trabajo_id === idBuscado);
      }
      const st = url.searchParams.get("estado");
      if (st && st.startsWith("neq.")) {
        const excluido = st.replace("neq.", "");
        lista = lista.filter((p) => p.estado !== excluido);
      }
      if (unObjeto) {
        return lista[0]
          ? responder(res, 200, lista[0])
          : responder(res, 406, { message: "sin filas" });
      }
      return responder(res, 200, lista);
    }
    if (ruta === "/rest/v1/mis_verificaciones") {
      if (yo?.id === ID_EN_REVISION) {
        return responder(res, 200, [
          {
            id: "v-rev-1",
            tipo: "dni_frente",
            estado: "pendiente",
            motivo_rechazo: null,
            created_at: hace(60),
          },
        ]);
      }
      return responder(res, 200, []);
    }
    if (ruta === "/rest/v1/perfiles_profesionales") {
      if (req.method === "PATCH") return responder(res, 200, [{ usuario_id: yo?.id }]);
      const uidsParam = url.searchParams.get("usuario_id");
      if (uidsParam && uidsParam.startsWith("in.")) {
        const ids = uidsParam.replace("in.(", "").replace(")", "").split(",");
        const filtrados = PERFILES_ADMIN.filter((p) => ids.includes(p.usuario_id)).map((p) => ({
          usuario_id: p.usuario_id,
          especialidades: "Instalaciones",
          promedio: 4.8,
          cantidad_resenas: 10,
          matriculado: p.matriculado,
          oficios: p.oficios,
        }));
        return responder(res, 200, filtrados);
      }
      const fila = {
        oficios: ["gas", "plomeria"],
        especialidades: "Instalaciones",
        descripcion: "Gasista matriculado.",
        anios_experiencia: 10,
        disponibilidad: "Lunes a viernes",
        toda_la_ciudad: false,
        zonas: [1, 2],
        publicado: yo?.id !== ID_EN_REVISION,
      };
      return responder(res, 200, unObjeto ? fila : [fila]);
    }
    if (ruta === "/rest/v1/barrios") {
      const lista = [
        { id: 1, nombre: "Centro" },
        { id: 2, nombre: "La Perla" },
        { id: 3, nombre: "Güemes" },
      ];
      const en = url.searchParams.get("id");
      if (en && en.startsWith("in.")) {
        const ids = en.replace("in.(", "").replace(")", "").split(",").map(Number);
        return responder(
          res,
          200,
          lista.filter((b) => ids.includes(b.id)),
        );
      }
      // Con `id=eq.N` (maybeSingle) devuelve solo el barrio pedido: maybeSingle falla con más de una fila.
      const pedido = Number((url.searchParams.get("id") ?? "").replace("eq.", ""));
      const fila = lista.find((b) => b.id === pedido) ?? lista[0];
      const filtrada = url.searchParams.has("id") ? [fila] : lista;
      return responder(res, 200, unObjeto ? fila : filtrada);
    }
    // Cualquier otra cosa (vistas, métricas): vacío.
    return responder(res, 200, unObjeto ? {} : []);
  });
});

server.listen(PUERTO, () => {
  process.stdout.write(`Supabase falso en http://localhost:${PUERTO}\n`);
});
