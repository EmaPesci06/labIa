import {
  BotonAccion,
  EnlaceSecundario,
  Layout,
  Parrafo,
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
    <Layout
      previa="Tu perfil ya aparece en las búsquedas de Oficio Seguro."
      titulo={`${nombre}, tu perfil ya está publicado`}
      subtitulo="Aprobamos tu verificación."
      motivo="Te escribimos porque terminamos de revisar tu perfil."
      pie={pie}
    >
      <Parrafo>
        Desde ahora los clientes te encuentran en las búsquedas y podés postularte a los trabajos
        que publican.
      </Parrafo>
      <BotonAccion href={urlTrabajos}>Ver trabajos publicados</BotonAccion>
      <EnlaceSecundario href={urlPerfil}>Ver cómo se ve mi perfil</EnlaceSecundario>
    </Layout>
  );
}

PerfilPublicado.PreviewProps = {
  nombre: "Pablo",
  urlPerfil: "https://labia.example/profesionales/demo",
  urlTrabajos: "https://labia.example/trabajos",
  pie: PIE_DE_PRUEBA,
} satisfies DatosPerfilPublicado & { pie: DatosPie };
