import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosEligieronAOtro = { nombre: string; tituloTrabajo: string; urlTrabajos: string };

export default function EligieronAOtro({
  nombre,
  tituloTrabajo,
  urlTrabajos,
  pie,
}: DatosEligieronAOtro & { pie: DatosPie }) {
  return (
    <Layout previa="El cliente eligió a otro profesional. Hay más trabajos esperándote." pie={pie}>
      <Text style={estilosTexto.titulo}>Esta vez eligieron a otro profesional</Text>
      <Text style={estilosTexto.parrafo}>
        Hola {nombre}, el cliente de <strong>{tituloTrabajo}</strong> eligió a otro profesional.
        Gracias por postularte.
      </Text>
      <Text style={estilosTexto.parrafo}>
        Todos los días se publican trabajos nuevos. Seguí mirando.
      </Text>
      <BotonAccion href={urlTrabajos}>Ver trabajos</BotonAccion>
    </Layout>
  );
}

EligieronAOtro.PreviewProps = {
  nombre: "Paula",
  tituloTrabajo: "Pérdida en la canilla de la cocina",
  urlTrabajos: "https://labia.example/trabajos",
  pie: PIE_DE_PRUEBA,
} satisfies DatosEligieronAOtro & { pie: DatosPie };
