import { BotonAccion, Layout, Parrafo, PIE_DE_PRUEBA, type DatosPie } from "@/lib/emails/Layout";

export type DatosBienvenidaCliente = { nombre: string; urlBuscar: string };

export default function BienvenidaCliente({
  nombre,
  urlBuscar,
  pie,
}: DatosBienvenidaCliente & { pie: DatosPie }) {
  return (
    <Layout
      previa="Tu cuenta en Oficio Seguro ya está lista."
      titulo={`Hola, ${nombre}`}
      subtitulo="Tu cuenta en Oficio Seguro ya está lista."
      motivo="Te escribimos porque creaste una cuenta en Oficio Seguro."
      pie={pie}
    >
      <Parrafo>
        Buscá plomeros, electricistas, gasistas y más oficios de Mar del Plata. Todos tienen la
        identidad y los antecedentes verificados.
      </Parrafo>
      <Parrafo>
        Si preferís que te escriban ellos, publicá lo que se rompió y elegí entre los que se
        postulen.
      </Parrafo>
      <BotonAccion href={urlBuscar}>Buscar profesionales</BotonAccion>
    </Layout>
  );
}

BienvenidaCliente.PreviewProps = {
  nombre: "Laura",
  urlBuscar: "https://labia.example/buscar",
  pie: PIE_DE_PRUEBA,
} satisfies DatosBienvenidaCliente & { pie: DatosPie };
