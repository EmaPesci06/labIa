import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
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
    <Layout previa={`No pudimos aprobar tu ${documento}. Subilo de nuevo.`} pie={pie}>
      <Text style={estilosTexto.titulo}>Necesitamos que vuelvas a subir un documento</Text>
      <Text style={estilosTexto.parrafo}>
        Hola {nombre}, no pudimos aprobar tu documento: <strong>{documento}</strong>.
      </Text>
      <Text style={{ ...estilosTexto.tarjeta, ...estilosTexto.parrafo }}>
        <strong>Motivo:</strong> {motivo}
      </Text>
      <Text style={estilosTexto.parrafo}>
        Subilo de nuevo con una foto bien iluminada y que se lea completa. Lo revisamos enseguida.
      </Text>
      <BotonAccion href={urlSubir}>Subir el documento</BotonAccion>
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
