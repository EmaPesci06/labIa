import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
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
    <Layout previa={`${nombreCliente} te va a escribir por WhatsApp.`} pie={pie}>
      <Text style={estilosTexto.titulo}>¡Te eligieron, {nombre}!</Text>
      <Text style={estilosTexto.parrafo}>
        {nombreCliente} te eligió para <strong>{tituloTrabajo}</strong>. {nombreCliente} te va a
        escribir por WhatsApp para coordinar.
      </Text>
      <Text style={estilosTexto.chico}>
        Tené el celular a mano y acordá precio, seña y día por ahí. Cuando termines, el cliente
        puede dejarte una reseña.
      </Text>
      <BotonAccion href={urlTrabajo}>Ver el trabajo</BotonAccion>
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
