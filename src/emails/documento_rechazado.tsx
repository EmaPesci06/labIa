import {
  BotonAccion,
  Layout,
  Nota,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosDocumentoRechazado = {
  nombre: string;
  /** Nombre legible del documento ("DNI (frente)"), nunca su contenido ni su número. */
  documento: string;
  motivo: string;
  urlSubir: string;
};

export default function DocumentoRechazado({
  nombre,
  documento,
  motivo,
  urlSubir,
  pie,
}: DatosDocumentoRechazado & { pie: DatosPie }) {
  return (
    <Layout
      previa={`No pudimos aprobar tu ${documento}. Subilo de nuevo.`}
      titulo="Hay que volver a subir un documento"
      subtitulo={`${nombre}, no pudimos aprobar tu ${documento}.`}
      motivo="Te escribimos porque revisamos tu documentación."
      pie={pie}
    >
      <Tarjeta etiqueta="Motivo" titulo={motivo} />
      <Parrafo>
        Subilo de nuevo con una foto bien iluminada y que se lea completa. Lo revisamos enseguida.
      </Parrafo>
      <BotonAccion href={urlSubir}>Subir el documento</BotonAccion>
      <Nota>Tu perfil no se publica hasta que lo aprobemos.</Nota>
    </Layout>
  );
}

DocumentoRechazado.PreviewProps = {
  nombre: "Pablo",
  documento: "DNI (frente)",
  motivo: "La foto está desenfocada y no se lee el apellido.",
  urlSubir: "https://labia.example/cuenta",
  pie: PIE_DE_PRUEBA,
} satisfies DatosDocumentoRechazado & { pie: DatosPie };
