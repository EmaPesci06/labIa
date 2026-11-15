import {
  BotonAccion,
  Layout,
  Nota,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosTeEligieron = {
  nombre: string;
  /** Nombre del cliente tal como lo ve el profesional ("Laura"). Nunca su teléfono. */
  nombreCliente: string;
  tituloTrabajo: string;
  urlTrabajo: string;
};

export default function TeEligieron({
  nombre,
  nombreCliente,
  tituloTrabajo,
  urlTrabajo,
  pie,
}: DatosTeEligieron & { pie: DatosPie }) {
  return (
    <Layout
      previa={`${nombreCliente} te va a escribir por WhatsApp.`}
      titulo={`${nombre}, te eligieron`}
      subtitulo={`${nombreCliente} quiere que hagas su trabajo.`}
      motivo="Te escribimos porque te postulaste a este trabajo."
      pie={pie}
      conPreferencias
    >
      <Tarjeta etiqueta="Trabajo" titulo={tituloTrabajo} />
      <Parrafo>
        {nombreCliente} te va a escribir por WhatsApp para coordinar. Tené el celular a mano y
        acordá precio, seña y día.
      </Parrafo>
      <BotonAccion href={urlTrabajo}>Ver el trabajo</BotonAccion>
      <Nota>
        Cuando termines, {nombreCliente} puede dejarte una reseña. Las reseñas son lo primero que
        miran los próximos clientes.
      </Nota>
    </Layout>
  );
}

TeEligieron.PreviewProps = {
  nombre: "Pablo",
  nombreCliente: "Laura",
  tituloTrabajo: "Pérdida en la canilla de la cocina",
  urlTrabajo: "https://labia.example/trabajos/demo",
  pie: PIE_DE_PRUEBA,
} satisfies DatosTeEligieron & { pie: DatosPie };
