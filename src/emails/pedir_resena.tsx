import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosPedirResena = {
  nombre: string;
  nombreProfesional: string;
  urlResena: string;
};

export default function PedirResena({
  nombre,
  nombreProfesional,
  urlResena,
  pie,
}: DatosPedirResena & { pie: DatosPie }) {
  return (
    <Layout previa={`Contanos cómo te fue con ${nombreProfesional}.`} pie={pie}>
      <Text style={estilosTexto.titulo}>¿Cómo te fue con {nombreProfesional}?</Text>
      <Text style={estilosTexto.parrafo}>
        Hola {nombre}, tu trabajo ya está terminado. Tu opinión ayuda a otras personas a elegir bien
        y a los buenos profesionales a conseguir más trabajo. Lleva un minuto.
      </Text>
      <BotonAccion href={urlResena}>Dejar mi reseña</BotonAccion>
    </Layout>
  );
}

PedirResena.PreviewProps = {
  nombre: "Laura",
  nombreProfesional: "Pablo Gómez",
  urlResena: "https://labia.example/profesionales/demo",
  pie: PIE_DE_PRUEBA,
} satisfies DatosPedirResena & { pie: DatosPie };
