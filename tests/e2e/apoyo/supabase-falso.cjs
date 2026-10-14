// Supabase FALSO para las pruebas del perfil público (LAB-24) en máquinas sin Docker.
// Responde solo lo que usan /profesionales/[id] y /cuenta/perfil, decide "quién mira" por el token
// (Authorization: Bearer ...) y no guarda nada. No es una prueba de la base: la RLS y la función
// `perfil_profesional` se prueban en supabase/tests/database/perfil_profesional.test.sql.
//
// Uso: LABIA_SUPABASE_FALSO_PUERTO=54399 node tests/e2e/apoyo/supabase-falso.cjs
const http = require("node:http");

const PUERTO = Number(process.env.LABIA_SUPABASE_FALSO_PUERTO ?? 54399);

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const ID_EN_REVISION = "22222222-2222-4222-8222-222222222222";
const ID_CLIENTE = "33333333-3333-4333-8333-333333333333";

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
};

const TOTAL_RESENAS = 25;
const ahora = Date.now();
// Reseña 1 tiene el autor borrado (autor_id null); el resto es de Laura F.
const resenas = Array.from({ length: TOTAL_RESENAS }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  autor_id: i === 1 ? null : ID_CLIENTE,
  puntaje: 5 - (i % 2),
  texto: `Reseña número ${i + 1}`,
  created_at: new Date(ahora - (i + 1) * 3_600_000).toISOString(),
}));

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

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PUERTO}`);
  const yo = usuarioDe(req);
  const unObjeto = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  let cuerpo = "";
  req.on("data", (c) => (cuerpo += c));
  req.on("end", () => {
    const ruta = url.pathname;

    if (ruta === "/auth/v1/user") {
      if (!yo) return responder(res, 401, { message: "sin sesión" });
      return responder(res, 200, {
        id: yo.id,
        aud: "authenticated",
        role: "authenticated",
        email: `${yo.nombre.toLowerCase()}@example.com`,
      });
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
