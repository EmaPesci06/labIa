import {
  BotonAccion,
  Layout,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
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
    <Layout
      previa="El cliente eligió a otro profesional. Hay más trabajos esperándote."
      titulo="Esta vez eligieron a otro profesional"
      subtitulo={`${nombre}, gracias por postularte.`}
      motivo="Te escribimos porque te postulaste a este trabajo."
      pie={pie}
      conPreferencias
      conBaja
    >
      <Tarjeta
        etiqueta="Trabajo"
        titulo={tituloTrabajo}
        detalle="El cliente ya eligió con quién trabajar."
      />
      <Parrafo>Todos los días se publican trabajos nuevos cerca tuyo. Seguí mirando.</Parrafo>
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
