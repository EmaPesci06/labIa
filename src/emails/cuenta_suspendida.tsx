import { Text } from "@react-email/components";

import {
  BotonAccion,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
  type DatosPie,
} from "@/lib/emails/Layout";

export type DatosCuentaSuspendida = {
  nombre: string;
  motivo: string;
  emailContacto: string;
};

export default function CuentaSuspendida({
  nombre,
  motivo,
  emailContacto,
  pie,
}: DatosCuentaSuspendida & { pie: DatosPie }) {
  return (
    <Layout previa="Tu cuenta de LabÍA fue suspendida." pie={pie}>
      <Text style={estilosTexto.titulo}>Tu cuenta fue suspendida</Text>
      <Text style={estilosTexto.parrafo}>
        Hola {nombre}, te informamos que tu cuenta de LabÍA fue suspendida por el siguiente motivo:
      </Text>
      <Text style={{ ...estilosTexto.tarjeta, ...estilosTexto.parrafo }}>
        <strong>Motivo:</strong> {motivo}
      </Text>
      <Text style={estilosTexto.parrafo}>
        Mientras tu cuenta esté suspendida no vas a poder publicar trabajos, postularte ni recibir
        contactos.
      </Text>
      <Text style={estilosTexto.parrafo}>
        Si creés que se trata de un error o querés solicitar una revisión, podés escribirnos a{" "}
        <strong>{emailContacto}</strong>.
      </Text>
      <BotonAccion href={`mailto:${emailContacto}?subject=Apelacion%20de%20cuenta%20suspendida`}>
        Escribir a soporte
      </BotonAccion>
    </Layout>
  );
}

CuentaSuspendida.PreviewProps = {
  nombre: "Martín",
  motivo: "Comportamiento inadecuado reportado por un cliente.",
  emailContacto: "soporte@labia.com.ar",
  pie: PIE_DE_PRUEBA,
} satisfies DatosCuentaSuspendida & { pie: DatosPie };
