import {
  BotonAccion,
  Layout,
  Nota,
  PIE_DE_PRUEBA,
  Tarjeta,
  type DatosPie,
} from "@/lib/emails/Layout";

export type PostulacionResumen = {
  nombreProfesional: string;
  /** Texto legible, por ejemplo "Plomería". */
  oficio: string;
  /** Texto ya formateado ("$ 45.000") o `null` si no puso precio. */
  precio: string | null;
  sena: string | null;
};

export type DatosNuevaPostulacion = {
  nombre: string;
  tituloTrabajo: string;
  postulaciones: PostulacionResumen[];
  urlTrabajo: string;
};

export function asuntoNuevaPostulacion(d: DatosNuevaPostulacion): string {
  const cantidad = d.postulaciones.length;
  return cantidad > 1
    ? `${cantidad} profesionales se postularon a ${d.tituloTrabajo}`
    : `${d.postulaciones[0]?.nombreProfesional ?? "Un profesional"} se postuló a ${d.tituloTrabajo}`;
}

export default function NuevaPostulacion({
  nombre,
  tituloTrabajo,
  postulaciones,
  urlTrabajo,
  pie,
}: DatosNuevaPostulacion & { pie: DatosPie }) {
  const asunto = asuntoNuevaPostulacion({ nombre, tituloTrabajo, postulaciones, urlTrabajo });
  return (
    <Layout
      previa="Mirá las propuestas y elegí con quién hablar."
      titulo={asunto}
      subtitulo={`${nombre}, llegaron propuestas para “${tituloTrabajo}”.`}
      motivo="Te escribimos porque publicaste este trabajo."
      pie={pie}
      conPreferencias
    >
      {postulaciones.map((p, i) => (
        <Tarjeta
          key={i}
          etiqueta={p.oficio}
          titulo={p.nombreProfesional}
          detalle={
            p.precio
              ? `Precio estimado: ${p.precio}${p.sena ? ` · Seña: ${p.sena}` : ""}`
              : "Precio a coordinar"
          }
        />
      ))}
      <BotonAccion href={urlTrabajo}>Ver las propuestas</BotonAccion>
      <Nota>Elegí con quién hablar. El contacto sigue por WhatsApp.</Nota>
    </Layout>
  );
}

NuevaPostulacion.PreviewProps = {
  nombre: "Laura",
  tituloTrabajo: "Pérdida en la canilla de la cocina",
  postulaciones: [
    { nombreProfesional: "Pablo Gómez", oficio: "Plomería", precio: "$ 45.000", sena: "$ 10.000" },
    { nombreProfesional: "Paula Díaz", oficio: "Plomería", precio: null, sena: null },
  ],
  urlTrabajo: "https://labia.example/trabajos/demo",
  pie: PIE_DE_PRUEBA,
} satisfies DatosNuevaPostulacion & { pie: DatosPie };
