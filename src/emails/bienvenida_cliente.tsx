import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosBienvenidaCliente = { nombre: string; urlBuscar: string };

export default function BienvenidaCliente({
  nombre,
  urlBuscar,
  pie,
}: DatosBienvenidaCliente & { pie: DatosPie }) {
  return (
    <Layout previa="Ya podés buscar profesionales verificados en Mar del Plata." pie={pie}>
      <Text style={estilosTexto.titulo}>¡Te damos la bienvenida, {nombre}!</Text>
      <Text style={estilosTexto.parrafo}>
        Tu cuenta en LabÍA ya está lista. Buscá plomeros, electricistas, gasistas y más oficios de
        Mar del Plata, con identidad y antecedentes verificados.
      </Text>
      <Text style={estilosTexto.parrafo}>
        Si preferís que te vengan a ofrecer su trabajo, publicá lo que necesitás y recibí
        postulaciones.
      </Text>
      <BotonAccion href={urlBuscar}>Buscar profesionales</BotonAccion>
    </Layout>
  );
}

BienvenidaCliente.PreviewProps = {
  nombre: "Laura",
  urlBuscar: "https://labia.example/buscar",
  pie: PIE_DE_PRUEBA,
} satisfies DatosBienvenidaCliente & { pie: DatosPie };
