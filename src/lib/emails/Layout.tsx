import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

import { urlDelSitio } from "@/lib/sitio";

// Los clientes de correo no leen variables CSS: los colores van fijos, tomados de los tokens
// claros de "Papelería sellada" (src/app/globals.css). Si cambia la paleta, se actualizan acá.
export const FONDO = "#eaf0ee"; // --color-fondo
export const TEXTO = "#16231f"; // --color-texto
export const ACCION = "#b8441b"; // --color-accion (botón; texto blanco, contraste 5,6:1)
export const ENCABEZADO = "#16231f"; // --color-encabezado
export const SOBRE_ENCABEZADO = "#eaf0ee"; // --color-sobre-encabezado
export const SUSPENDIDA = "#47564f"; // --color-texto-suave: cabecera de la cuenta suspendida
const BLANCO = "#ffffff"; // --color-superficie y --color-sobre-accion

// Archivo llega por Google Fonts y, si no carga, usa la tipografía de sistema de respaldo.
const titular = "'Archivo', Arial, Helvetica, sans-serif";
const cuerpo = "'Archivo', Arial, Helvetica, sans-serif";

// Logo PNG alojado en public/emails/logo.png (640 x 254, sale de docs/marca/png): los clientes de
// email no muestran SVG. Va sobre la franja blanca de la tarjeta, que se ve igual en modo oscuro.
const LOGO = { ancho: 160, alto: 64, ruta: "/emails/logo.png" };

const estilos = {
  cuerpo: {
    backgroundColor: FONDO,
    color: TEXTO,
    margin: 0,
    padding: "24px 12px",
    fontFamily: cuerpo,
  },
  contenedor: { maxWidth: 600, margin: "0 auto" },
  tarjeta: {
    backgroundColor: BLANCO,
    borderRadius: 28,
    overflow: "hidden",
  },
  franjaLogo: { padding: "20px 32px 16px", backgroundColor: BLANCO },
  logo: { display: "block", border: 0, outline: "none", height: "auto" },
  cabecera: { padding: "24px 32px 20px", backgroundColor: ENCABEZADO, color: SOBRE_ENCABEZADO },
  cabeceraSuspendida: { padding: "24px 32px 20px", backgroundColor: SUSPENDIDA, color: BLANCO },
  titulo: {
    margin: 0,
    color: SOBRE_ENCABEZADO,
    fontFamily: titular,
    fontSize: 40,
    lineHeight: "39px",
    fontWeight: 800,
  },
  subtitulo: { margin: "8px 0 0", color: SOBRE_ENCABEZADO, fontSize: 18, lineHeight: "25px" },
  contenido: { padding: "24px 32px" },
  pie: { margin: "16px 0 0", textAlign: "center", fontSize: 14, lineHeight: "21px" },
} satisfies Record<string, CSSProperties>;

/** Párrafo del cuerpo: texto corrido de 17 px. */
export function Parrafo({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 16px", fontSize: 17, lineHeight: "25px", color: TEXTO }}>
      {children}
    </Text>
  );
}

/** Caja de color fondo (radio 20) con una etiqueta chica, un dato grande y un detalle opcional. */
export function Tarjeta({
  etiqueta,
  titulo,
  detalle,
}: {
  etiqueta: string;
  titulo: ReactNode;
  detalle?: string;
}) {
  return (
    <Section
      style={{
        backgroundColor: FONDO,
        borderRadius: 20,
        padding: "14px 20px",
        margin: "0 0 16px",
      }}
    >
      <Text style={{ margin: 0, fontSize: 15, lineHeight: "21px", color: TEXTO }}>{etiqueta}</Text>
      <Text
        style={{
          margin: "2px 0 0",
          fontFamily: titular,
          fontSize: 24,
          lineHeight: "28px",
          fontWeight: 800,
          color: TEXTO,
        }}
      >
        {titulo}
      </Text>
      {detalle ? (
        <Text style={{ margin: "4px 0 0", fontSize: 16, lineHeight: "22px", color: TEXTO }}>
          {detalle}
        </Text>
      ) : null}
    </Section>
  );
}

/** Botón principal: color acción, alto 60, radio 18, texto blanco. */
export function BotonAccion({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 16px" }}>
      <Button
        href={href}
        style={{
          display: "block",
          backgroundColor: ACCION,
          color: BLANCO,
          borderRadius: 18,
          padding: "19px 24px",
          fontFamily: cuerpo,
          fontSize: 19,
          fontWeight: 600,
          lineHeight: "22px",
          textAlign: "center",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** Acción secundaria: enlace en negrita, centrado. */
export function EnlaceSecundario({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 16px", textAlign: "center" }}>
      <Link
        href={href}
        style={{ color: TEXTO, fontSize: 16, fontWeight: 600, textDecoration: "underline" }}
      >
        {children}
      </Link>
    </Text>
  );
}

/** Nota al pie de la tarjeta, separada por una línea de fondo de 2 px. */
export function Nota({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        margin: "8px 0 0",
        paddingTop: 14,
        borderTop: `2px solid ${FONDO}`,
        fontSize: 15,
        lineHeight: "22px",
        color: TEXTO,
      }}
    >
      {children}
    </Text>
  );
}

/** Datos del pie que arma `enviarEmail`: las plantillas no los calculan. */
export type DatosPie = {
  /** Link de baja con token firmado en el fragmento (no requiere ingresar). */
  urlBaja: string;
  /** Baja de un clic (RFC 8058, header `List-Unsubscribe`). Solo si hay token. */
  urlBajaUnClic?: string;
  /** Pantalla `/cuenta/emails` (requiere ingresar). */
  urlPreferencias: string;
};

type Props = {
  /** Texto que se ve en la bandeja de entrada junto al asunto. */
  previa: string;
  /** Título grande de la cabecera. */
  titulo: string;
  /** Línea debajo del título, dentro de la cabecera. */
  subtitulo: string;
  /** `suspendida` cambia la cabecera a gris verdoso. */
  variante?: "normal" | "suspendida";
  /** Por qué le llega este email. Va en el pie. */
  motivo: string;
  pie: DatosPie;
  /** Muestra el enlace "Elegir qué emails recibo" (requiere ingresar). */
  conPreferencias?: boolean;
  /** Muestra el enlace de baja. Solo en los emails de novedades. */
  conBaja?: boolean;
  children: ReactNode;
};

export function Layout({
  previa,
  titulo,
  subtitulo,
  variante = "normal",
  motivo,
  pie,
  conPreferencias = false,
  conBaja = false,
  children,
}: Props) {
  const suspendida = variante === "suspendida";
  return (
    <Html lang="es-AR">
      <Head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- el email no pasa por _document */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap"
        />
      </Head>
      <Preview>{previa}</Preview>
      <Body style={estilos.cuerpo}>
        <Container style={estilos.contenedor}>
          <Section style={estilos.tarjeta}>
            <Section style={estilos.franjaLogo}>
              <Img
                src={`${urlDelSitio()}${LOGO.ruta}`}
                width={LOGO.ancho}
                height={LOGO.alto}
                alt="Oficio Seguro"
                style={estilos.logo}
              />
            </Section>
            <Section style={suspendida ? estilos.cabeceraSuspendida : estilos.cabecera}>
              {/* Un párrafo con rol de título: el texto plano no lo pasa a mayúsculas, como sí hace con h1. */}
              <Text role="heading" aria-level={1} style={estilos.titulo}>
                {titulo}
              </Text>
              <Text style={estilos.subtitulo}>{subtitulo}</Text>
            </Section>
            <Section style={estilos.contenido}>{children}</Section>
          </Section>
          <Text style={estilos.pie}>
            {motivo}
            <br />
            Oficio Seguro, Mar del Plata
            {conPreferencias || conBaja ? <br /> : null}
            {conPreferencias ? (
              <Link href={pie.urlPreferencias} style={{ color: TEXTO, fontWeight: 600 }}>
                Elegir qué emails recibo
              </Link>
            ) : null}
            {conPreferencias && conBaja ? " · " : null}
            {conBaja ? (
              <Link href={pie.urlBaja} style={{ color: TEXTO, fontWeight: 600 }}>
                Darme de baja de estos avisos
              </Link>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Datos de ejemplo del pie para la vista previa (`pnpm email:dev`) y los tests. */
export const PIE_DE_PRUEBA: DatosPie = {
  urlBaja: "https://labia.example/baja#t=ejemplo",
  urlBajaUnClic: "https://labia.example/api/baja?t=ejemplo",
  urlPreferencias: "https://labia.example/cuenta/emails",
};
