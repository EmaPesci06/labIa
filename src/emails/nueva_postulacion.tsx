import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
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
    <Layout previa="Mirá las propuestas y elegí con quién hablar." pie={pie}>
      <Text style={estilosTexto.titulo}>{asunto}</Text>
      <Text style={estilosTexto.parrafo}>
        Hola {nombre}, recibiste {postulaciones.length > 1 ? "nuevas propuestas" : "una propuesta"}{" "}
        para tu trabajo.
      </Text>
      {postulaciones.map((p, i) => (
        <Text key={i} style={{ ...estilosTexto.tarjeta, ...estilosTexto.parrafo }}>
          <strong>{p.nombreProfesional}</strong> · {p.oficio}
          <br />
          {p.precio ? `Precio estimado: ${p.precio}` : "Precio a coordinar"}
          {p.sena ? ` · Seña: ${p.sena}` : ""}
        </Text>
      ))}
      <BotonAccion href={urlTrabajo}>Ver las propuestas</BotonAccion>
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
