import "server-only";

import { render } from "@react-email/render";
import * as Sentry from "@sentry/nextjs";
import { createElement, type ComponentType } from "react";
import { Resend } from "resend";

import { urlDelSitio } from "@/lib/sitio";

import type { DatosPie } from "./Layout";
import { definicion, type DatosPlantillas, type Plantilla } from "./plantillas";
import { firmarTokenBaja } from "./token";

/** Mientras no haya dominio verificado (LAB-7), Resend solo permite este remitente de prueba. */
const REMITENTE_POR_DEFECTO = "LabÍA <onboarding@resend.dev>";

export type EnvioEmail<K extends Plantilla> = {
  para: string;
  /** Si se pasa, el pie lleva un link de baja firmado para ese usuario. */
  usuarioId?: string;
  plantilla: K;
  datos: DatosPlantillas[K];
};

export type ResultadoEnvio =
  | { estado: "enviado" }
  /** No hay `RESEND_API_KEY` (desarrollo, previews sin configurar): no es un error. */
  | { estado: "omitido" }
  | { estado: "fallido" };

/** Link de baja y de preferencias del pie. Sin secreto, la baja manda a la pantalla de preferencias. */
export function armarPie(usuarioId: string | undefined, plantilla: Plantilla): DatosPie {
  const sitio = urlDelSitio();
  const urlPreferencias = `${sitio}/cuenta/emails`;
  const secreto = process.env.EMAILS_SECRET;
  if (!usuarioId || !secreto) return { urlBaja: urlPreferencias, urlPreferencias };

  const categoria = definicion(plantilla).preferencia ?? "novedades";
  const token = firmarTokenBaja({ usuarioId, categoria }, secreto);
  return { urlBaja: `${sitio}/baja?t=${encodeURIComponent(token)}`, urlPreferencias };
}

async function mandar(
  cliente: Resend,
  mensaje: Parameters<Resend["emails"]["send"]>[0],
): Promise<boolean> {
  try {
    const { error } = await cliente.emails.send(mensaje);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Manda un email con Resend. **Nunca lanza**: ante cualquier problema devuelve `fallido` (y avisa a
 * Sentry sin el destinatario) para no romper el flujo que lo llamó. Reintenta una vez.
 * Sin `RESEND_API_KEY` no hace nada (`omitido`).
 */
export async function enviarEmail<K extends Plantilla>(
  envio: EnvioEmail<K>,
): Promise<ResultadoEnvio> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return { estado: "omitido" };

  try {
    const def = definicion(envio.plantilla);
    const pie = armarPie(envio.usuarioId, envio.plantilla);
    const componente = def.componente as unknown as ComponentType<Record<string, unknown>>;
    const elemento = createElement(componente, { ...envio.datos, pie });
    const [html, text] = await Promise.all([
      render(elemento),
      render(elemento, { plainText: true }),
    ]);

    const soporte = process.env.EMAIL_SOPORTE;
    const conBaja = pie.urlBaja !== pie.urlPreferencias;
    // Baja de un clic (RFC 8058): el cliente de correo hace POST a esta URL, que no es la página.
    const urlBajaUnClic = pie.urlBaja.replace("/baja?", "/api/baja?");
    const mensaje = {
      from: process.env.EMAIL_REMITENTE || REMITENTE_POR_DEFECTO,
      to: envio.para,
      subject: def.asunto(envio.datos),
      html,
      text,
      ...(soporte ? { replyTo: soporte } : {}),
      ...(conBaja
        ? {
            headers: {
              "List-Unsubscribe": `<${urlBajaUnClic}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    };

    const cliente = new Resend(clave);
    if ((await mandar(cliente, mensaje)) || (await mandar(cliente, mensaje))) {
      return { estado: "enviado" };
    }
    // Sin el destinatario ni el contenido: solo qué plantilla falló.
    Sentry.captureException(new Error(`No se pudo enviar el email "${envio.plantilla}"`));
    return { estado: "fallido" };
  } catch {
    Sentry.captureException(new Error(`No se pudo preparar el email "${envio.plantilla}"`));
    return { estado: "fallido" };
  }
}
