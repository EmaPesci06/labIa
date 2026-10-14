import type { Metadata } from "next";
import Link from "next/link";

import { DocumentoLegal, Marcador, type SeccionLegal } from "@/components/legales/DocumentoLegal";
import { ListaNormas } from "@/components/normas/ListaNormas";
import { MARCADORES, RUTA_PRIVACIDAD } from "@/lib/legales";

export const metadata: Metadata = { title: "Términos y condiciones · LabÍA" };

// BORRADOR (LAB-35) para revisión de un abogado (LAB-36). Cada punto que necesita criterio legal
// lleva `{/* REVISAR ABOGADO */}`. Los valores a completar están en `MARCADORES` (src/lib/legales.ts).

const secciones: readonly SeccionLegal[] = [
  {
    id: "quienes-somos",
    titulo: "Qué es LabÍA y quién lo opera",
    contenido: (
      <>
        <p>
          LabÍA es una plataforma web que ayuda a vecinos de Mar del Plata a encontrar profesionales
          de oficios (carpintería, plomería, cerrajería, gas, pintura, mecánica y electricidad) y a
          ponerse en contacto con ellos.
        </p>
        <p>
          La opera <Marcador>{MARCADORES.razonSocial}</Marcador>, CUIT{" "}
          <Marcador>{MARCADORES.cuit}</Marcador>, con domicilio en{" "}
          <Marcador>{MARCADORES.domicilio}</Marcador>. Podés escribirnos a{" "}
          <Marcador>{MARCADORES.emailContacto}</Marcador>.
        </p>
        <p>Al crear una cuenta o usar LabÍA aceptás estos términos y la Política de privacidad.</p>
      </>
    ),
  },
  {
    id: "intermediario",
    titulo: "LabÍA es un intermediario",
    contenido: (
      <>
        <p>
          LabÍA conecta a clientes con profesionales, pero no presta los servicios. El acuerdo de
          trabajo se hace directamente entre el cliente y el profesional, y es entre ellos.
        </p>
        <p>
          LabÍA no garantiza resultados, precios, plazos ni disponibilidad, ni que un profesional
          responda o acepte un trabajo. La verificación de identidad y antecedentes que hacemos es
          una ayuda para generar confianza: no es una garantía sobre la calidad del trabajo ni sobre
          la conducta futura de nadie.
        </p>
        <p>
          El contacto es siempre por WhatsApp. LabÍA no tiene chat interno y no interviene en lo que
          se hable o acuerde por ahí.
        </p>
      </>
    ),
  },
  {
    id: "profesionales",
    titulo: "Requisitos para profesionales",
    contenido: (
      <>
        <p>Para aparecer en las búsquedas, un profesional tiene que:</p>
        <ul>
          <li>Ser mayor de 18 años y usar su identidad real.</li>
          <li>Subir su DNI (frente y dorso) y un certificado de antecedentes vigente.</li>
          <li>Si trabaja en gas, subir además su matrícula vigente.</li>
          <li>Aceptar las normas de seguridad de LabÍA y volver a aceptarlas si cambian.</li>
        </ul>
        <p>
          Revisamos esos documentos a mano. Solo se muestran las insignias de verificación, nunca
          los documentos. El tratamiento de estos datos sensibles se explica en la{" "}
          <Link href={RUTA_PRIVACIDAD}>Política de privacidad</Link> y requiere tu consentimiento
          expreso.
        </p>
        <p>Las normas de seguridad son estas diez:</p>
        <ListaNormas />
      </>
    ),
  },
  {
    id: "clientes",
    titulo: "Requisitos para clientes",
    contenido: (
      <>
        <ul>
          <li>Ser mayor de 18 años.</li>
          <li>Dar datos reales y mantenerlos al día.</li>
          <li>Usar LabÍA de buena fe: publicar solo trabajos que de verdad querés contratar.</li>
          <li>Tratar con respeto a los profesionales.</li>
        </ul>
        <p>
          Nunca te pedimos tu dirección exacta: elegís un barrio. La dirección se la das vos al
          profesional que elijas, por fuera de LabÍA.
        </p>
      </>
    ),
  },
  {
    id: "pagos",
    titulo: "Precios, señas y pagos",
    contenido: (
      <>
        <p>
          Los precios, las señas, los materiales y las formas de pago se acuerdan entre cliente y
          profesional, por fuera de LabÍA. En esta versión LabÍA no cobra, no retiene ni gestiona
          dinero, y no cobra comisión.
        </p>
        <p>
          Te recomendamos pedir el presupuesto por escrito antes de empezar, con precio, materiales
          y plazo.
        </p>
      </>
    ),
  },
  {
    id: "resenas",
    titulo: "Reseñas",
    contenido: (
      <>
        <p>
          Los clientes pueden reseñar a los profesionales con los que trabajaron. Las reseñas tienen
          que ser verdaderas, basadas en una experiencia real y respetuosas.
        </p>
        <p>
          Está prohibido publicar reseñas falsas, escribir sobre un trabajo que no hiciste, ofrecer
          o pedir algo a cambio de una reseña, o reseñar a un profesional con el que tenés una
          relación que afecta tu opinión.
        </p>
        <p>
          Podemos moderar reseñas: ocultar o quitar las que incumplan estos términos o resulten
          falsas, ofensivas o con datos personales.
        </p>
      </>
    ),
  },
  {
    id: "contenido",
    titulo: "Contenido prohibido, reportes y suspensión",
    contenido: (
      <>
        <p>No se puede publicar ni enviar por LabÍA:</p>
        <ul>
          <li>Datos falsos, o hacerse pasar por otra persona.</li>
          <li>Contenido ofensivo, discriminatorio, violento o sexual.</li>
          <li>Estafas, publicidad no relacionada con los oficios o enlaces engañosos.</li>
          <li>Datos personales de terceros sin su permiso.</li>
          <li>Todo lo que viole la ley o derechos de otras personas.</li>
        </ul>
        <p>
          Cualquier persona puede reportar un perfil, una reseña o un trabajo desde la app.
          Revisamos los reportes y, si corresponde, quitamos contenido o suspendemos la cuenta, con
          o sin aviso previo si hay riesgo para otras personas.
        </p>
        {/* REVISAR ABOGADO: plazo y procedimiento de apelación de una suspensión. */}
        <p>
          Si suspendimos tu cuenta y creés que fue un error, podés apelar escribiendo a{" "}
          <Marcador>{MARCADORES.emailContacto}</Marcador> con tu nombre y el motivo. Revisamos cada
          apelación y te respondemos por email.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidad",
    titulo: "Limitación de responsabilidad",
    contenido: (
      <>
        {/* REVISAR ABOGADO: alcance de la limitación de responsabilidad (límites de la Ley 24.240 y del Código Civil y Comercial). */}
        <p>
          LabÍA presta el servicio de conexión «tal como está». En la medida que la ley lo permita,
          no respondemos por los daños que surjan del trabajo que un profesional hace o deja de
          hacer, ni de los acuerdos entre clientes y profesionales, ni por la información que los
          usuarios cargan, ni por interrupciones del servicio.
        </p>
        <p>
          Esto no limita los derechos que la ley te da como consumidor ni la responsabilidad que no
          pueda excluirse legalmente.
        </p>
      </>
    ),
  },
  {
    id: "cambios",
    titulo: "Cambios en los términos",
    contenido: (
      <>
        {/* REVISAR ABOGADO: forma y anticipación del aviso de cambios. */}
        <p>
          Podemos actualizar estos términos. Si el cambio es importante, te avisamos por email y con
          un aviso en la app antes de que empiece a regir. Al pie de esta página siempre ves la
          versión y la fecha vigentes. Si seguís usando LabÍA después del aviso, entendemos que
          aceptás los cambios; si no estás de acuerdo, podés borrar tu cuenta desde «Mi cuenta».
        </p>
        <p>
          Si cambian las normas de seguridad, los profesionales tienen que aceptarlas de nuevo para
          seguir usando LabÍA.
        </p>
      </>
    ),
  },
  {
    id: "ley-aplicable",
    titulo: "Ley aplicable y jurisdicción",
    contenido: (
      <>
        {/* REVISAR ABOGADO: jurisdicción (tribunales ordinarios de Mar del Plata) y su compatibilidad con la elección del consumidor (art. 36 Ley 24.240). */}
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Para cualquier conflicto
          serán competentes los tribunales ordinarios de la ciudad de Mar del Plata, sin perjuicio
          de tu derecho como consumidor a litigar en el tribunal de tu domicilio.
        </p>
      </>
    ),
  },
  {
    id: "consumidor",
    titulo: "Defensa del consumidor",
    contenido: (
      <>
        {/* REVISAR ABOGADO: ¿aplica el botón de arrepentimiento (Res. 424/2020 de la Secretaría de Comercio)? LabÍA no cobra, así que probablemente no, pero confirmar. */}
        <p>
          Como LabÍA no vende productos ni servicios con costo para vos, creemos que el botón de
          arrepentimiento no aplica en esta versión. Igual podés borrar tu cuenta cuando quieras.
        </p>
        <p>
          Si tenés un reclamo como consumidor, podés presentarlo ante la Dirección de Defensa del
          Consumidor de tu municipio o en{" "}
          <a
            href="https://www.argentina.gob.ar/produccion/defensadelconsumidor"
            target="_blank"
            rel="noopener noreferrer"
          >
            argentina.gob.ar/produccion/defensadelconsumidor
          </a>
          .
        </p>
      </>
    ),
  },
];

/** Términos y condiciones: borrador para revisión legal (LAB-35). */
export default function Terminos() {
  return (
    <DocumentoLegal
      titulo="Términos y condiciones"
      introduccion="Las reglas para usar LabÍA, en lenguaje claro."
      secciones={secciones}
      otroDocumento={{ href: RUTA_PRIVACIDAD, etiqueta: "Leer la Política de privacidad" }}
    />
  );
}
