import type { Metadata } from "next";
import Link from "next/link";

import { DocumentoLegal, Marcador, type SeccionLegal } from "@/components/legales/DocumentoLegal";
import { MARCADORES, RUTA_TERMINOS } from "@/lib/legales";

export const metadata: Metadata = { title: "Política de privacidad · LabÍA" };

// BORRADOR (LAB-35) para revisión de un abogado (LAB-36). Describe lo que la app hace de verdad:
// si cambia el comportamiento (datos, proveedores, plazos), actualizá el texto y `VERSION_LEGALES`.
// Cada punto que necesita criterio legal lleva `{/* REVISAR ABOGADO */}`.

const secciones: readonly SeccionLegal[] = [
  {
    id: "responsable",
    titulo: "Quién es responsable de tus datos",
    contenido: (
      <>
        <p>
          El responsable del tratamiento es <Marcador>{MARCADORES.razonSocial}</Marcador>, CUIT{" "}
          <Marcador>{MARCADORES.cuit}</Marcador>, con domicilio en{" "}
          <Marcador>{MARCADORES.domicilio}</Marcador>.
        </p>
        <p>
          Para cualquier consulta sobre tus datos escribinos a{" "}
          <Marcador>{MARCADORES.emailContacto}</Marcador>.
        </p>
      </>
    ),
  },
  {
    id: "datos",
    titulo: "Qué datos juntamos y para qué",
    contenido: (
      <>
        <ul>
          <li>
            <strong>Tu cuenta:</strong> nombre, apellido, email, número de WhatsApp y barrio. Los
            usamos para que puedas ingresar, para que te encuentren y contacten, y para avisarte por
            email (nuevos trabajos cerca, postulaciones, novedades). Podés darte de baja de los
            avisos desde «Mi cuenta» o con el link de cada email.
          </li>
          <li>
            <strong>Tu perfil profesional:</strong> oficios, zonas donde trabajás, descripción,
            tarifas y fotos de tus trabajos.
          </li>
          <li>
            <strong>Tus trabajos, postulaciones y reseñas:</strong> lo que publicás o escribís en la
            app.
          </li>
          <li>
            <strong>Datos sensibles de profesionales:</strong> imagen de tu DNI (frente y dorso) y
            tu certificado de antecedentes, y la matrícula si trabajás en gas. Los usamos{" "}
            <em>solo</em> para verificar tu identidad y la seguridad de los clientes, y únicamente
            con tu consentimiento expreso, que te pedimos con una casilla antes de subirlos.
          </li>
          <li>
            <strong>Datos técnicos:</strong> usamos PostHog para medir qué partes de la app se usan
            y Sentry para detectar errores. Los configuramos para no enviar datos personales (ni
            nombres, ni emails, ni teléfonos, ni documentos).
          </li>
        </ul>
        <p>
          <strong>Nunca pedimos ni guardamos tu dirección exacta.</strong> Elegís un barrio, y la
          distancia que ves se calcula entre centros de barrio.
        </p>
        {/* REVISAR ABOGADO: base legal de cada tratamiento y si hace falta registrar la base de datos ante la AAIP (Ley 25.326, art. 21). */}
        <p>
          No usamos tus datos para publicidad de terceros y no los vendemos. LabÍA no tiene chat
          interno ni cobra pagos: esas conversaciones y acuerdos pasan por WhatsApp, fuera de
          nuestro control.
        </p>
      </>
    ),
  },
  {
    id: "publico",
    titulo: "Qué se muestra públicamente",
    contenido: (
      <ul>
        <li>
          <strong>Se ve:</strong> tu nombre con la inicial del apellido, tu foto, tu barrio, tus
          oficios, tu descripción, tus reseñas y tus insignias de verificación.
        </li>
        <li>
          <strong>Nunca se ve:</strong> tu DNI, tu certificado de antecedentes, tu matrícula (solo
          la insignia), tu dirección ni tu email.
        </li>
        <li>
          <strong>Tu teléfono:</strong> el WhatsApp de un profesional no está en las páginas; se
          muestra recién cuando un cliente decide contactarlo. El de un cliente le llega solo al
          profesional que ese cliente eligió para su trabajo.
        </li>
      </ul>
    ),
  },
  {
    id: "documentos",
    titulo: "Cómo cuidamos tus documentos",
    contenido: (
      <ul>
        <li>
          Los documentos se guardan en un almacenamiento privado. Vos podés subirlos pero no leerlos
          de nuevo.
        </li>
        <li>
          Solo el equipo de verificación de LabÍA los ve, desde un panel interno, con enlaces
          temporales que vencen a los 60 segundos.
        </li>
        <li>No aparecen en ninguna pantalla pública, ni en emails, ni en métricas.</li>
      </ul>
    ),
  },
  {
    id: "donde-se-guardan",
    titulo: "Dónde se guardan y transferencias",
    contenido: (
      <>
        {/* REVISAR ABOGADO: transferencia internacional de datos (art. 12 Ley 25.326 y normativa de la AAIP: cláusulas contractuales / países adecuados). */}
        <p>
          Para dar el servicio usamos proveedores que guardan o procesan datos fuera de Argentina:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (base de datos, cuentas y archivos), en la región de São
            Paulo, Brasil.
          </li>
          <li>
            <strong>Vercel</strong> (alojamiento de la aplicación).
          </li>
          <li>
            <strong>Resend</strong> (envío de emails).
          </li>
          <li>
            <strong>PostHog</strong> (métricas de uso, sin datos personales) y{" "}
            <strong>Sentry</strong> (errores, sin datos personales).
          </li>
        </ul>
        <p>
          Al usar LabÍA aceptás que tus datos se traten en esos servicios. Pedimos a cada proveedor
          medidas de seguridad acordes.
        </p>
      </>
    ),
  },
  {
    id: "conservacion",
    titulo: "Cuánto tiempo los guardamos",
    contenido: (
      <>
        {/* REVISAR ABOGADO: plazos de conservación frente a obligaciones legales y posibles reclamos. */}
        <ul>
          <li>
            <strong>Documentos de verificación:</strong> se borran a los 30 días de revisados. Nos
            queda solo el resultado de la verificación (insignia o rechazo).
          </li>
          <li>
            <strong>Tu cuenta y tus datos:</strong> hasta que la borres. Al borrar tu cuenta
            eliminamos tus datos personales; podemos conservar lo que la ley nos obligue a guardar.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "derechos",
    titulo: "Tus derechos",
    contenido: (
      <>
        <p>
          La Ley 25.326 de Protección de los Datos Personales te da derecho a acceder a tus datos, a
          rectificarlos y a pedir que los suprimamos.
        </p>
        <ul>
          <li>
            <strong>Acceso:</strong> en «Mi cuenta» podés descargar una copia de tus datos.
          </li>
          <li>
            <strong>Rectificación:</strong> editás tus datos en «Mi cuenta».
          </li>
          <li>
            <strong>Supresión:</strong> en «Mi cuenta» podés borrar tu cuenta.
          </li>
          <li>
            También podés ejercerlos escribiendo a <Marcador>{MARCADORES.emailContacto}</Marcador>;
            te respondemos dentro de los plazos legales.
          </li>
        </ul>
        <p>
          La Agencia de Acceso a la Información Pública es la autoridad de control de la Ley 25.326:
          atiende las denuncias y reclamos de quienes vean afectados sus derechos. Podés contactarla
          en{" "}
          <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer">
            argentina.gob.ar/aaip
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    titulo: "Cookies y almacenamiento local",
    contenido: (
      <>
        <p>Usamos el almacenamiento de tu navegador para:</p>
        <ul>
          <li>
            <strong>Mantener tu sesión</strong> iniciada (necesario para usar la app).
          </li>
          <li>
            <strong>Recordar tu tema</strong> claro u oscuro, y algunas preferencias de pantalla.
          </li>
          <li>
            <strong>Medir el uso</strong> de forma anónima (PostHog), sin datos personales.
          </li>
        </ul>
        {/* REVISAR ABOGADO: si hace falta pedir consentimiento para la analítica. */}
        <p>No usamos cookies de publicidad.</p>
      </>
    ),
  },
  {
    id: "menores",
    titulo: "Menores de edad",
    contenido: (
      <p>
        LabÍA es solo para mayores de 18 años. Si nos enteramos de que una persona menor creó una
        cuenta, la vamos a borrar.
      </p>
    ),
  },
  {
    id: "cambios",
    titulo: "Cambios en esta política",
    contenido: (
      <p>
        Si cambia el modo en que tratamos tus datos, actualizamos esta política y te avisamos por
        email y en la app. Al pie de la página ves la versión y la fecha vigentes. Los{" "}
        <Link href={RUTA_TERMINOS}>Términos y condiciones</Link> también se aplican a tu uso de
        LabÍA.
      </p>
    ),
  },
];

/** Política de privacidad: borrador para revisión legal (LAB-35). */
export default function Privacidad() {
  return (
    <DocumentoLegal
      titulo="Política de privacidad"
      introduccion="Qué datos tuyos usamos, para qué, y cómo los cuidamos."
      secciones={secciones}
      otroDocumento={{ href: RUTA_TERMINOS, etiqueta: "Leer los Términos y condiciones" }}
    />
  );
}
