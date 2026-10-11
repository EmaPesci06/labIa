// Métricas de uso con PostHog (LAB-15). Lista cerrada de eventos del MVP, sin datos personales.
// Si falta NEXT_PUBLIC_POSTHOG_KEY, o se llama desde el servidor, todo es no-op.
// Para eventos que pasan en una Server Action, usá `registrarEventoServidor` de metricas-servidor.ts.

import posthog, { type CaptureResult } from "posthog-js";

// Valores de los enums de la guía §6. Cuando LAB-11 genere los tipos de Supabase, se pueden
// reemplazar por los de la base.
export type Oficio =
  "carpinteria" | "plomeria" | "cerrajeria" | "gas" | "pintura" | "mecanica" | "electricidad";
export type Rol = "cliente" | "profesional" | "admin";
export type Urgencia = "lo_antes_posible" | "esta_semana" | "sin_apuro";
export type MotivoReporte =
  "datos_falsos" | "comportamiento" | "estafa" | "contenido_inapropiado" | "otro";

type SinPropiedades = Record<string, never>;

/** Eventos del MVP y sus propiedades. Agregar uno nuevo es un cambio de código a propósito. */
export interface EventosMetricas {
  registro_iniciado: { rol: Exclude<Rol, "admin"> };
  registro_completado: { rol: Exclude<Rol, "admin"> };
  documentos_enviados: SinPropiedades;
  profesional_verificado: SinPropiedades;
  busqueda_realizada: { oficio: Oficio; barrio_id: number; resultados: number };
  perfil_visto: { oficio: Oficio };
  whatsapp_abierto: { origen: "perfil" | "postulacion" };
  trabajo_publicado: { oficio: Oficio; urgencia: Urgencia };
  postulacion_enviada: { oficio: Oficio };
  postulante_elegido: SinPropiedades;
  resena_publicada: { puntaje: 1 | 2 | 3 | 4 | 5 };
  reporte_enviado: { motivo: MotivoReporte };
}

export type NombreEvento = keyof EventosMetricas;

/** Los eventos sin propiedades se llaman solo con el nombre. */
export type ArgumentosEvento<N extends NombreEvento> = EventosMetricas[N] extends SinPropiedades
  ? []
  : [propiedades: EventosMetricas[N]];

let iniciado = false;
let ultimaRutaVista: string | null = null;

function clavePostHog(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
}

/** Saca query string y hash de las URLs: ahí puede viajar cualquier cosa. */
export function urlSinParametros(url: string): string {
  const corte = url.search(/[?#]/);
  return corte === -1 ? url : url.slice(0, corte);
}

const PROPIEDADES_URL = [
  "$current_url",
  "$referrer",
  "$initial_referrer",
  "$initial_current_url",
  "$session_entry_url",
  "$session_entry_referrer",
];

function limpiarUrls(propiedades: Record<string, unknown> | undefined): void {
  if (!propiedades) return;
  for (const clave of PROPIEDADES_URL) {
    const valor = propiedades[clave];
    if (typeof valor === "string") propiedades[clave] = urlSinParametros(valor);
  }
}

/** `before_send` de PostHog: URLs sin query también en las propiedades de persona. */
export function limpiarCaptura(captura: CaptureResult | null): CaptureResult | null {
  if (!captura) return null;
  limpiarUrls(captura.properties);
  limpiarUrls(captura.$set);
  limpiarUrls(captura.$set_once);
  return captura;
}

/** Inicializa PostHog una sola vez. Devuelve `false` si no hay clave o no hay navegador. */
export function iniciarMetricas(): boolean {
  if (iniciado) return true;
  const clave = clavePostHog();
  if (!clave || typeof window === "undefined") return false;

  posthog.init(clave, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    opt_out_capturing_by_default: false,
    mask_personal_data_properties: true,
    custom_personal_data_properties: ["email", "tel", "telefono", "whatsapp", "dni", "nombre"],
    // Sin feature flags en el MVP: evita el pedido a /flags, que manda la URL inicial completa.
    advanced_disable_flags: true,
    before_send: limpiarCaptura,
  });
  iniciado = true;
  return true;
}

export function registrarEvento<N extends NombreEvento>(
  nombre: N,
  ...[propiedades]: ArgumentosEvento<N>
): void {
  if (!iniciarMetricas()) return;
  posthog.capture(nombre, propiedades);
}

/** Vista de página manual en cada cambio de ruta del App Router (solo el path, sin query). */
export function registrarPaginaVista(pathname: string): void {
  // React en modo estricto corre los efectos dos veces en desarrollo: una vista por ruta.
  if (!iniciarMetricas() || pathname === ultimaRutaVista) return;
  ultimaRutaVista = pathname;
  posthog.capture("$pageview", {
    $current_url: urlSinParametros(window.location.origin + pathname),
  });
}

/** Identifica a la persona solo por su uuid y su rol. Nunca email, nombre ni teléfono. */
export function identificarUsuario(usuario: { id: string; rol: Rol }): void {
  if (!iniciarMetricas()) return;
  posthog.identify(usuario.id, { rol: usuario.rol });
}

/** Al cerrar sesión, para que la próxima persona en el mismo navegador no herede el id. */
export function olvidarUsuario(): void {
  if (!iniciarMetricas()) return;
  posthog.reset();
}

/** Solo para tests. */
export function reiniciarMetricasParaTests(): void {
  iniciado = false;
  ultimaRutaVista = null;
}
