import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DocumentoRevision } from "@/components/admin/DocumentoRevision";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { nombreOficio } from "@/lib/oficios";
import { obtenerDetalleProfesional } from "@/lib/verificacion/datos";

type Props = { params: Promise<{ usuarioId: string }> };

export const metadata: Metadata = { title: "Revisar verificación · LabÍA" };

const CHECKLIST = [
  "El nombre del DNI coincide con el del perfil.",
  "El certificado es de la misma persona y tiene menos de 90 días.",
  "El resultado dice que no registra antecedentes.",
  "La matrícula está vigente (gasistas: consultá el registro del ente si hace falta).",
] as const;

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));

/** Revisión de los documentos de un profesional (LAB-21). */
export default async function RevisarVerificacion({ params }: Props) {
  const { usuarioId } = await params;
  if (!z.uuid().safeParse(usuarioId).success) notFound();
  const detalle = await obtenerDetalleProfesional(usuarioId);
  if (!detalle) notFound();

  const nombre = [detalle.nombre, detalle.apellido].filter(Boolean).join(" ");
  const pendientes = detalle.documentos.filter((d) => d.estado === "pendiente").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/verificaciones"
          className="inline-flex min-h-11 w-fit items-center text-sm font-bold text-azul hover:underline"
        >
          ← Volver a verificaciones
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-titulo text-[28px] font-extrabold lg:text-4xl">{nombre}</h1>
          <p className="text-texto-secundario">
            {detalle.oficios.map(nombreOficio).join(" · ") || "Sin oficios cargados"}
            {detalle.barrio ? ` · ${detalle.barrio}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {detalle.identidadVerificada ? <Insignia variante="verificada" /> : null}
            {detalle.antecedentesOk ? <Insignia variante="antecedentes" /> : null}
            {detalle.matriculado ? <Insignia variante="matriculado" /> : null}
            <span className="text-sm font-semibold text-texto-secundario">
              {detalle.publicado
                ? "Perfil publicado"
                : pendientes > 0
                  ? `Sin publicar · ${pendientes} ${pendientes === 1 ? "documento por revisar" : "documentos por revisar"}`
                  : "Sin publicar"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <Tarjeta borde className="flex flex-col gap-3">
            <h2 className="font-titulo text-lg font-extrabold">Datos del perfil</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="font-semibold text-texto-secundario">Nombre</dt>
              <dd>{nombre}</dd>
              <dt className="font-semibold text-texto-secundario">WhatsApp</dt>
              <dd className="break-all">{detalle.whatsapp ?? "Sin cargar"}</dd>
              <dt className="font-semibold text-texto-secundario">Email</dt>
              <dd className="break-all">{detalle.email ?? "No disponible"}</dd>
              <dt className="font-semibold text-texto-secundario">Oficios</dt>
              <dd>{detalle.oficios.map(nombreOficio).join(", ") || "Sin cargar"}</dd>
              <dt className="font-semibold text-texto-secundario">Matrícula declarada</dt>
              <dd>{detalle.matricula ?? "No declarada"}</dd>
              <dt className="font-semibold text-texto-secundario">Normas aceptadas</dt>
              <dd>
                {detalle.normasAceptadasAt
                  ? `Versión ${detalle.normasVersion ?? "—"} · ${fecha(detalle.normasAceptadasAt)}`
                  : "Todavía no"}
              </dd>
            </dl>
          </Tarjeta>

          <Tarjeta borde className="flex flex-col gap-3">
            <h2 className="font-titulo text-lg font-extrabold">Checklist de revisión</h2>
            <p className="text-sm text-texto-secundario">
              Lo marcás mientras revisás. No se guarda.
            </p>
            <ul className="flex flex-col gap-2.5">
              {CHECKLIST.map((texto) => (
                <li key={texto}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-snug">
                    <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-azul" />
                    <span>{texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <p className="text-sm text-texto-secundario">
            Los documentos no se muestran en ninguna pantalla pública: solo las insignias. Cada vez
            que abrís un archivo queda registrado.
          </p>
        </div>

        <section aria-labelledby="documentos-titulo" className="flex flex-col gap-4">
          <h2 id="documentos-titulo" className="font-titulo text-lg font-extrabold">
            Documentos
          </h2>
          {detalle.documentos.map((documento) => (
            <DocumentoRevision key={documento.id} documento={documento} />
          ))}
        </section>
      </div>
    </div>
  );
}
