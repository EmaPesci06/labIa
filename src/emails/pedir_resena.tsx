import { BotonAccion, Layout, Parrafo, PIE_DE_PRUEBA, type DatosPie } from "@/lib/emails/Layout";

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
    <Layout
      previa={`Contanos cómo te fue con ${nombreProfesional}.`}
      titulo={`¿Cómo te fue con ${nombreProfesional}?`}
      subtitulo={`${nombre}, tu trabajo ya está terminado.`}
      motivo={`Te escribimos porque elegiste a ${nombreProfesional} para este trabajo.`}
      pie={pie}
      conPreferencias
      conBaja
    >
      <Parrafo>
        Tu opinión ayuda a otras personas a elegir bien y a los buenos profesionales a conseguir más
        trabajo. Lleva un minuto.
      </Parrafo>
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
