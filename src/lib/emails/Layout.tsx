import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

// Los emails no pueden usar los tokens CSS de la app: van estilos en línea con la marca.
// Tipografía del sistema por compatibilidad con los clientes de correo.
export const COLOR_AZUL = "#232F49";
const AZUL = COLOR_AZUL;
const NARANJA = "#B84A25";
const TEXTO = "#1F2937";
const GRIS = "#5B6472";

const fuente =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const estilos = {
  cuerpo: { backgroundColor: "#F4F5F7", margin: 0, padding: "24px 12px", fontFamily: fuente },
  contenedor: {
    maxWidth: 520,
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
  },
  cabecera: { backgroundColor: AZUL, padding: "18px 24px" },
  marca: { margin: 0, color: "#FFFFFF", fontSize: 22, fontWeight: 700, letterSpacing: 0.2 },
  contenido: { padding: "24px 24px 8px" },
  pie: { padding: "0 24px 24px" },
  textoPie: { margin: "8px 0 0", color: GRIS, fontSize: 12, lineHeight: "18px" },
} satisfies Record<string, CSSProperties>;

export const estilosTexto = {
  titulo: {
    margin: "0 0 12px",
    color: AZUL,
    fontSize: 22,
    lineHeight: "28px",
    fontWeight: 700,
  },
  parrafo: { margin: "0 0 14px", color: TEXTO, fontSize: 16, lineHeight: "24px" },
  chico: { margin: "0 0 10px", color: GRIS, fontSize: 14, lineHeight: "20px" },
  tarjeta: {
    margin: "0 0 12px",
    padding: "12px 14px",
    border: "1px solid #E2E5EA",
    borderRadius: 10,
  },
} satisfies Record<string, CSSProperties>;

/** Datos del pie que arma `enviarEmail`: las plantillas no los calculan. */
export type DatosPie = {
  /** Link de baja con token firmado (no requiere ingresar). */
  urlBaja: string;
  /** Pantalla `/cuenta/emails` (requiere ingresar). */
  urlPreferencias: string;
};

type Props = {
  /** Texto que se ve en la bandeja de entrada junto al asunto. */
  previa: string;
  pie: DatosPie;
  children: ReactNode;
};

export function Layout({ previa, pie, children }: Props) {
  return (
    <Html lang="es-AR">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={estilos.cuerpo}>
        <Container style={estilos.contenedor}>
          <Section style={estilos.cabecera}>
            <Text style={estilos.marca}>LabÍA</Text>
          </Section>
          <Section style={estilos.contenido}>{children}</Section>
          <Section style={estilos.pie}>
            <Hr style={{ borderColor: "#E2E5EA", margin: "8px 0 12px" }} />
            <Text style={estilos.textoPie}>
              Recibís este email porque tenés cuenta en LabÍA.
              <br />
              <Link href={pie.urlPreferencias} style={{ color: GRIS }}>
                Cambiar mis preferencias de email
              </Link>
              {" · "}
              <Link href={pie.urlBaja} style={{ color: GRIS }}>
                Darme de baja de estos avisos
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Botón de acción principal: naranja `#B84A25` con texto blanco. */
export function BotonAccion({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 18px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: NARANJA,
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 700,
          textDecoration: "none",
          borderRadius: 10,
          padding: "13px 22px",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** Datos de ejemplo del pie para la vista previa (`pnpm email:dev`) y los tests. */
export const PIE_DE_PRUEBA: DatosPie = {
  urlBaja: "https://labia.example/baja?t=ejemplo",
  urlPreferencias: "https://labia.example/cuenta/emails",
};
