import { describe, expect, it } from "vitest";

import {
  armarExportacion,
  nombreArchivoExportacion,
  nombreConInicial,
  type EntradaExportacion,
} from "./exportar";

const YO = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";

const base: EntradaExportacion = {
  fecha: new Date("2026-10-14T15:00:00Z"),
  yo: YO,
  email: "laura@example.com",
  usuario: {
    rol: "cliente",
    nombre: "Laura",
    apellido: "Fernández",
    whatsapp: "+5492235551234",
    estado: "activa",
    foto_path: "perfiles/x/1.jpg",
    barrio_id: 17,
    created_at: "2026-10-01T10:00:00Z",
  },
  barrio: "Centro",
  perfil: {
    oficios: ["plomeria"],
    fotos_trabajos: ["trabajos-hechos/x/1.jpg"],
    descripcion: "Plomero",
  },
  barriosDeZonas: ["Centro"],
  matricula: null,
  preferenciasEmail: { trabajos_cerca: true, novedades: false, usuario_id: YO },
  trabajosPublicados: [{ id: "t1", titulo: "Canilla", fotos: ["trabajos/t1/a.jpg"] }],
  trabajosAsignados: [
    { id: "t2", titulo: "Cañería", cliente_id: OTRO, fotos: ["trabajos/t2/a.jpg"] },
  ],
  postulacionesEnviadas: [{ trabajo_id: "t2", mensaje: "Hola", estado: "elegida" }],
  postulacionesRecibidas: [{ trabajo_id: "t1", profesional_id: OTRO, mensaje: "Privado" }],
  contactos: [{ cliente_id: YO, profesional_id: OTRO, origen: "perfil", created_at: "x" }],
  resenasEscritas: [{ profesional_id: OTRO, puntaje: 5, texto: "Bien" }],
  resenasRecibidas: [{ autor_id: OTRO, puntaje: 4 }],
  reportesHechos: [{ objetivo_tipo: "perfil", objetivo_id: OTRO, motivo: "otro" }],
  verificaciones: [{ tipo: "dni_frente", estado: "aprobado", storage_path: "x/dni_frente-1.jpg" }],
  personas: new Map([[OTRO, { nombre: "Pablo", apellido: "Gómez" }]]),
};

describe("nombreConInicial", () => {
  it("deja nombre e inicial", () => {
    expect(nombreConInicial("Laura", "Fernández")).toBe("Laura F.");
    expect(nombreConInicial("Laura", "f")).toBe("Laura F.");
    expect(nombreConInicial("Laura", null)).toBe("Laura");
    expect(nombreConInicial(null, "X")).toBe("Persona de LabÍA");
  });
});

describe("nombreArchivoExportacion", () => {
  it("usa la fecha de Buenos Aires", () => {
    expect(nombreArchivoExportacion(new Date("2026-10-15T01:30:00Z"))).toBe(
      "labia-mis-datos-2026-10-14.json",
    );
  });
});

describe("armarExportacion", () => {
  const texto = JSON.stringify(armarExportacion(base));

  it("no incluye rutas de archivos", () => {
    for (const prohibido of [
      "storage_path",
      "foto_path",
      "fotos_trabajos",
      "perfiles/",
      "trabajos/",
      "dni_frente-1.jpg",
    ]) {
      expect(texto).not.toContain(prohibido);
    }
  });

  it("de otras personas solo deja nombre con inicial", () => {
    expect(texto).toContain("Pablo G.");
    expect(texto).not.toContain("Gómez");
    expect(texto).not.toContain(OTRO);
    expect(texto).not.toContain("Privado");
  });

  it("incluye lo propio", () => {
    const datos = armarExportacion(base);
    expect(datos.cuenta).toMatchObject({
      email: "laura@example.com",
      nombre: "Laura",
      barrio: "Centro",
    });
    expect(datos.verificaciones).toEqual([
      { tipo: "dni_frente", estado: "aprobado", motivo_rechazo: null, created_at: null },
    ]);
    expect(datos.contactos).toMatchObject([{ con: "Pablo G.", origen: "perfil" }]);
  });
});
