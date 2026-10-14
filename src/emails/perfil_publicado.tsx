import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosPerfilPublicado = { nombre: string; urlPerfil: string; urlTrabajos: string };

export default function PerfilPublicado({
  nombre,
  urlPerfil,
  urlTrabajos,
  pie,
}: DatosPerfilPublicado & { pie: DatosPie }) {
  return (
    <Layout previa="Tu perfil ya aparece en las búsquedas de LabÍA." pie={pie}>
      <Text style={estilosTexto.titulo}>¡Tu perfil ya está publicado, {nombre}!</Text>
      <Text style={estilosTexto.parrafo}>
        Aprobamos tu verificación. Desde ahora los clientes te encuentran en las búsquedas y podés
        postularte a los trabajos que publican.
      </Text>
      <BotonAccion href={urlTrabajos}>Ver trabajos publicados</BotonAccion>
      <Text style={estilosTexto.chico}>Así se ve tu perfil para los clientes: {urlPerfil}</Text>
    </Layout>
  );
}

PerfilPublicado.PreviewProps = {
  nombre: "Pablo",
  urlPerfil: "https://labia.example/profesionales/demo",
  urlTrabajos: "https://labia.example/trabajos",
  pie: PIE_DE_PRUEBA,
} satisfies DatosPerfilPublicado & { pie: DatosPie };
