import {
  BotonAccion,
  Layout,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
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
    <Layout
      previa="Tu cuenta de Oficio Seguro fue suspendida."
      titulo="Tu cuenta fue suspendida"
      subtitulo={`${nombre}, te contamos por qué y qué podés hacer.`}
      variante="suspendida"
      motivo="Este aviso es sobre tu cuenta y no se puede desactivar."
      pie={pie}
    >
      <Tarjeta etiqueta="Motivo" titulo={motivo} />
      <Parrafo>
        Mientras esté suspendida no vas a poder publicar trabajos, postularte ni recibir contactos.
      </Parrafo>
      <Parrafo>
        Si creés que es un error, escribinos a <strong>{emailContacto}</strong> y lo revisamos.
      </Parrafo>
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
