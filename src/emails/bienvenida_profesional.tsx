import {
  BotonAccion,
  Layout,
  Nota,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosBienvenidaProfesional = { nombre: string; urlPerfil: string };

export default function BienvenidaProfesional({
  nombre,
  urlPerfil,
  pie,
}: DatosBienvenidaProfesional & { pie: DatosPie }) {
  return (
    <Layout
      previa="Estamos revisando tu documentación."
      titulo={`Recibimos tu perfil, ${nombre}`}
      subtitulo="Lo estamos revisando."
      motivo="Te escribimos porque creaste una cuenta de profesional en LabÍA."
      pie={pie}
    >
      <Tarjeta
        etiqueta="Qué revisamos"
        titulo="DNI y antecedentes"
        detalle="Si sos gasista, también la matrícula."
      />
      <Parrafo>
        Cuando todo esté aprobado, tu perfil aparece en las búsquedas y te avisamos por acá.
      </Parrafo>
      <BotonAccion href={urlPerfil}>Ver mi perfil</BotonAccion>
      <Nota>
        Es un paso que cuida a los clientes y a vos: solo se muestran perfiles verificados.
      </Nota>
    </Layout>
  );
}

BienvenidaProfesional.PreviewProps = {
  nombre: "Pablo",
  urlPerfil: "https://labia.example/profesionales/demo",
  pie: PIE_DE_PRUEBA,
} satisfies DatosBienvenidaProfesional & { pie: DatosPie };
