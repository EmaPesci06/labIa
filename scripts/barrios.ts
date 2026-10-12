/**
 * Genera los `insert` de los barrios del Partido de General Pueyrredon con su centro.
 *
 * Fuente: OpenStreetMap (ODbL), relaciones `boundary=administrative` + `admin_level=9`
 * dentro del partido (relación 2621716). Son los barrios oficiales de la Municipalidad de
 * General Pueyrredon cargados en OSM. El portal de datos abiertos de la Municipalidad
 * (https://datos.mardelplata.gob.ar) bloquea las descargas automáticas, por eso se usa OSM.
 *
 * Para cada barrio se arma el polígono a partir de sus vías `outer`/`inner`, se calcula el
 * centroide y, si cae fuera del polígono (barrios cóncavos), se toma el punto interior más
 * cercano al centroide. Se suman a mano los nombres populares de la tarea LAB-11 que no son
 * barrios oficiales (`EXTRAS`).
 *
 * Uso (Node 24 ejecuta TypeScript directo):
 *   node scripts/barrios.ts > /tmp/barrios.sql
 * y se pega el resultado en una migración NUEVA (nunca se edita una ya mergeada).
 * Los ids se asignan por orden alfabético del slug: si se regenera, revisar que no cambien
 * los ids existentes (usuarios y trabajos los referencian).
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RELACION_PARTIDO = 2621716;

type Punto = [lon: number, lat: number];

interface Miembro {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
}

interface Relacion {
  type: "relation";
  id: number;
  tags: Record<string, string>;
  members: Miembro[];
}

interface Barrio {
  nombre: string;
  slug: string;
  centro: Punto;
  fuente: string;
}

/** Nombres populares pedidos en LAB-11 que no son barrios oficiales. Coordenadas verificadas en OSM. */
const EXTRAS: { nombre: string; centro: Punto; fuente: string }[] = [
  { nombre: "Plaza Mitre", centro: [-57.5528, -38.0033], fuente: "OSM leisure=park Plaza Mitre" },
  { nombre: "Stella Maris", centro: [-57.5359, -38.0122], fuente: "OSM, iglesia Stella Maris" },
  { nombre: "Varese", centro: [-57.532, -38.014], fuente: "OSM, Playa Varese" },
  { nombre: "Chauvín", centro: [-57.5521, -38.0143], fuente: "OSM place=suburb n3516403320" },
  {
    nombre: "Bosque Peralta Ramos",
    centro: [-57.5719, -38.0879],
    fuente: "OSM place=suburb n8529109122",
  },
  { nombre: "Camet", centro: [-57.5277, -37.9018], fuente: "OSM place=neighbourhood n2428071824" },
  {
    nombre: "Sierra de los Padres",
    centro: [-57.7756, -37.9413],
    fuente: "OSM boundary Sierra de los Padres",
  },
];

export function slugificar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mismoPunto(a: Punto, b: Punto): boolean {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

/** Une vías sueltas en anillos cerrados. */
export function armarAnillos(vias: Punto[][]): Punto[][] {
  const pendientes = vias.map((v) => [...v]);
  const anillos: Punto[][] = [];
  while (pendientes.length > 0) {
    const anillo = pendientes.shift() ?? [];
    let cambio = true;
    while (anillo.length > 0 && !mismoPunto(anillo[0]!, anillo[anillo.length - 1]!) && cambio) {
      cambio = false;
      const fin = anillo[anillo.length - 1]!;
      for (let i = 0; i < pendientes.length; i++) {
        const via = pendientes[i]!;
        if (mismoPunto(via[0]!, fin)) {
          anillo.push(...via.slice(1));
        } else if (mismoPunto(via[via.length - 1]!, fin)) {
          anillo.push(...via.reverse().slice(1));
        } else {
          continue;
        }
        pendientes.splice(i, 1);
        cambio = true;
        break;
      }
    }
    if (anillo.length >= 4 && mismoPunto(anillo[0]!, anillo[anillo.length - 1]!)) {
      anillos.push(anillo);
    }
  }
  return anillos;
}

function areaYCentroide(anillo: Punto[]): { area: number; cx: number; cy: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x0, y0] = anillo[i]!;
    const [x1, y1] = anillo[i + 1]!;
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  return { area: a, cx: a === 0 ? 0 : cx / (6 * a), cy: a === 0 ? 0 : cy / (6 * a) };
}

function dentroDeAnillo(p: Punto, anillo: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]!;
    const [xj, yj] = anillo[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

function dentro(p: Punto, exteriores: Punto[][], interiores: Punto[][]): boolean {
  return (
    exteriores.some((r) => dentroDeAnillo(p, r)) && !interiores.some((r) => dentroDeAnillo(p, r))
  );
}

/** Centroide del área; si cae afuera, el punto interior de una grilla más cercano al centroide. */
export function centroBarrio(exteriores: Punto[][], interiores: Punto[][]): Punto | null {
  let area = 0;
  let sx = 0;
  let sy = 0;
  for (const [anillos, signo] of [
    [exteriores, 1],
    [interiores, -1],
  ] as const) {
    for (const r of anillos) {
      const { area: a, cx, cy } = areaYCentroide(r);
      const aa = Math.abs(a) * signo;
      area += aa;
      sx += cx * aa;
      sy += cy * aa;
    }
  }
  if (area === 0) return null;
  const centroide: Punto = [sx / area, sy / area];
  if (dentro(centroide, exteriores, interiores)) return centroide;

  const todos = exteriores.flat();
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const pasos = 60;
  let mejor: Punto | null = null;
  let mejorDist = Infinity;
  for (let i = 1; i < pasos; i++) {
    for (let j = 1; j < pasos; j++) {
      const p: Punto = [minX + ((maxX - minX) * i) / pasos, minY + ((maxY - minY) * j) / pasos];
      if (!dentro(p, exteriores, interiores)) continue;
      const d = (p[0] - centroide[0]) ** 2 + (p[1] - centroide[1]) ** 2;
      if (d < mejorDist) {
        mejorDist = d;
        mejor = p;
      }
    }
  }
  return mejor;
}

async function descargar(): Promise<Relacion[]> {
  const consulta = `[out:json][timeout:120];rel(${RELACION_PARTIDO});map_to_area->.a;rel(area.a)["boundary"="administrative"]["admin_level"="9"];out geom;`;
  for (let intento = 1; intento <= 5; intento++) {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "labia-barrios/1.0",
      },
      body: new URLSearchParams({ data: consulta }),
    });
    const texto = await res.text();
    if (res.ok && texto.trimStart().startsWith("{")) {
      const json = JSON.parse(texto) as { elements: Relacion[] };
      return json.elements;
    }
    await new Promise((r) => setTimeout(r, 5000 * intento));
  }
  throw new Error("Overpass no respondió después de 5 intentos");
}

function sqlTexto(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const relaciones = await descargar();
  const barrios: Barrio[] = [];
  for (const rel of relaciones) {
    const nombre = rel.tags.name?.trim();
    if (!nombre) continue;
    const vias = (rol: string): Punto[][] =>
      rel.members
        .filter((m) => m.type === "way" && (m.role === rol || (rol === "outer" && m.role === "")))
        .map((m) => (m.geometry ?? []).map((g): Punto => [g.lon, g.lat]));
    const centro = centroBarrio(armarAnillos(vias("outer")), armarAnillos(vias("inner")));
    if (!centro) {
      process.stderr.write(`Sin geometría: ${nombre} (r${rel.id})\n`);
      continue;
    }
    barrios.push({ nombre, slug: slugificar(nombre), centro, fuente: `OSM r${rel.id}` });
  }
  for (const extra of EXTRAS) {
    const slug = slugificar(extra.nombre);
    if (barrios.some((b) => b.slug === slug)) continue;
    barrios.push({ ...extra, slug });
  }
  barrios.sort((a, b) => a.slug.localeCompare(b.slug));

  const filas = barrios.map(
    (b, i) =>
      `  (${i + 1}, ${sqlTexto(b.nombre)}, ${sqlTexto(b.slug)}, 'SRID=4326;POINT(${b.centro[0].toFixed(5)} ${b.centro[1].toFixed(5)})')${i === barrios.length - 1 ? ";" : ","} -- ${b.fuente}`,
  );
  process.stdout.write(
    `-- Generado con scripts/barrios.ts (${new Date().toISOString().slice(0, 10)}). Datos © OpenStreetMap (ODbL).\n` +
      `insert into public.barrios (id, nombre, slug, centro) values\n${filas.join("\n")}\n`,
  );
}

if (process.argv[1]?.endsWith("barrios.ts")) {
  await main();
}
