import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosBienvenidaProfesional = { nombre: string; urlPerfil: string };

export default function BienvenidaProfesional({
  nombre,
  urlPerfil,
  pie,
}: DatosBienvenidaProfesional & { pie: DatosPie }) {
  return (
    <Layout previa="Recibimos tu perfil. Lo estamos revisando." pie={pie}>
      <Text style={estilosTexto.titulo}>Recibimos tu perfil, {nombre}</Text>
      <Text style={estilosTexto.parrafo}>
        Estamos revisando tu documentación. Cuando todo esté aprobado, tu perfil aparece en las
        búsquedas y te avisamos por acá.
      </Text>
      <Text style={estilosTexto.chico}>
        Es un paso que cuida a los clientes y a vos: solo se muestran perfiles verificados.
      </Text>
      <BotonAccion href={urlPerfil}>Ver mi perfil</BotonAccion>
    </Layout>
  );
}

BienvenidaProfesional.PreviewProps = {
  nombre: "Pablo",
  urlPerfil: "https://labia.example/profesionales/demo",
  pie: PIE_DE_PRUEBA,
} satisfies DatosBienvenidaProfesional & { pie: DatosPie };
