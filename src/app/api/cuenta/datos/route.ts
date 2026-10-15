import { NextResponse } from "next/server";

import {
  armarExportacion,
  nombreArchivoExportacion,
  type EntradaExportacion,
} from "@/lib/cuenta/exportar";
import { limitarPersistente } from "@/lib/rate-limit-persistente";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

// "Descargar mis datos" (Ley 25.326). Se lee todo con la sesión de la persona: la RLS limita cada
// consulta a lo suyo y `armarExportacion` deja pasar solo una lista blanca de campos.
export async function GET() {
  const sinCache = { "Cache-Control": "no-store" };
  if (!supabaseConfigurado()) {
    return NextResponse.json(
      { error: "No disponible por ahora." },
      { status: 503, headers: sinCache },
    );
  }
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  const usuario = auth.user;
  if (!usuario) {
    return NextResponse.json(
      { error: "Ingresá para descargar tus datos." },
      { status: 401, headers: sinCache },
    );
  }
  const uid = usuario.id;

  const limite = await limitarPersistente(`cuenta-exportar:${uid}`, {
    maximo: 5,
    ventanaMs: 60_000,
  });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: `Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.` },
      { status: 429, headers: sinCache },
    );
  }

  const [
    usuarioFila,
    perfil,
    matricula,
    preferencias,
    publicados,
    asignados,
    enviadas,
    contactos,
    escritas,
    recibidas,
    reportes,
    verificaciones,
  ] = await Promise.all([
    supabase.from("usuarios").select("*").eq("id", uid).maybeSingle(),
    supabase
      .from("perfiles_profesionales")
      .select(
        "oficios, especialidades, descripcion, anios_experiencia, toda_la_ciudad, zonas, disponibilidad, identidad_verificada, antecedentes_ok, matriculado, publicado, promedio, cantidad_resenas, created_at",
      )
      .eq("usuario_id", uid)
      .maybeSingle(),
    supabase
      .from("matricula_propia")
      .select("matricula_numero")
      .eq("usuario_id", uid)
      .maybeSingle(),
    supabase
      .from("preferencias_email")
      .select("trabajos_cerca, novedades")
      .eq("usuario_id", uid)
      .maybeSingle(),
    supabase.from("trabajos").select("*").eq("cliente_id", uid),
    supabase.from("trabajos").select("*").eq("profesional_elegido_id", uid),
    supabase.from("postulaciones").select("*").eq("profesional_id", uid),
    supabase.from("contactos").select("*").or(`cliente_id.eq.${uid},profesional_id.eq.${uid}`),
    supabase.from("resenas").select("*").eq("autor_id", uid),
    supabase.from("resenas").select("*").eq("profesional_id", uid),
    supabase.from("reportes").select("*").eq("autor_id", uid),
    supabase.from("mis_verificaciones").select("tipo, estado, motivo_rechazo, created_at"),
  ]);

  const trabajosPublicados = publicados.data ?? [];
  const idsPublicados = trabajosPublicados.map((t) => t.id);
  const recibidasPost = idsPublicados.length
    ? ((await supabase.from("postulaciones").select("*").in("trabajo_id", idsPublicados)).data ??
      [])
    : [];

  // Barrios (propio y zonas) y nombres de las otras personas, reducidos a "Nombre I.".
  const idsBarrios = [usuarioFila.data?.barrio_id, ...(perfil.data?.zonas ?? [])].filter(
    (id): id is number => typeof id === "number",
  );
  const { data: barrios } = idsBarrios.length
    ? await supabase.from("barrios").select("id, nombre").in("id", idsBarrios)
    : { data: [] };
  const nombreBarrio = new Map((barrios ?? []).map((b) => [b.id, b.nombre]));

  const idsPersonas = new Set<string>();
  for (const t of asignados.data ?? []) idsPersonas.add(t.cliente_id);
  for (const p of recibidasPost) idsPersonas.add(p.profesional_id);
  for (const c of contactos.data ?? [])
    idsPersonas.add(c.cliente_id === uid ? c.profesional_id : c.cliente_id);
  for (const r of escritas.data ?? []) idsPersonas.add(r.profesional_id);
  for (const r of recibidas.data ?? []) if (r.autor_id) idsPersonas.add(r.autor_id);
  idsPersonas.delete(uid);
  const { data: personas } = idsPersonas.size
    ? await supabase
        .from("usuarios_publicos")
        .select("id, nombre, apellido_inicial")
        .in("id", [...idsPersonas])
    : { data: [] };

  const entrada: EntradaExportacion = {
    fecha: new Date(),
    yo: uid,
    email: usuario.email ?? null,
    usuario: usuarioFila.data,
    barrio: nombreBarrio.get(usuarioFila.data?.barrio_id ?? -1) ?? null,
    perfil: perfil.data,
    barriosDeZonas: (perfil.data?.zonas ?? []).flatMap((z) => nombreBarrio.get(z) ?? []),
    matricula: matricula.data?.matricula_numero ?? null,
    preferenciasEmail: preferencias.data,
    trabajosPublicados,
    trabajosAsignados: asignados.data ?? [],
    postulacionesEnviadas: enviadas.data ?? [],
    postulacionesRecibidas: recibidasPost,
    contactos: contactos.data ?? [],
    resenasEscritas: escritas.data ?? [],
    resenasRecibidas: recibidas.data ?? [],
    reportesHechos: reportes.data ?? [],
    verificaciones: verificaciones.data ?? [],
    personas: new Map(
      (personas ?? []).flatMap((p) =>
        p.id ? [[p.id, { nombre: p.nombre, apellido: p.apellido_inicial }] as const] : [],
      ),
    ),
  };

  const cuerpo = JSON.stringify(armarExportacion(entrada), null, 2);
  return new NextResponse(cuerpo, {
    headers: {
      ...sinCache,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivoExportacion(entrada.fecha)}"`,
    },
  });
}
