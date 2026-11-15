import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DocumentoRevision } from "@/components/admin/DocumentoRevision";
import { Encabezado } from "@/components/ui/Encabezado";
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
  const oficios = detalle.oficios.map(nombreOficio).join(" · ") || "Sin oficios cargados";

  return (
    <>
      <Encabezado
        variante="equipo"
        titulo={nombre}
        volver={{ href: "/admin/verificaciones", etiqueta: "Volver a verificaciones" }}
        descripcion={`${oficios}${detalle.barrio ? ` · ${detalle.barrio}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {detalle.identidadVerificada ? <Insignia variante="verificada" /> : null}
          {detalle.antecedentesOk ? <Insignia variante="antecedentes" /> : null}
          {detalle.matriculado ? <Insignia variante="matriculado" /> : null}
          <span className="text-[15px] font-bold">
            {detalle.publicado
              ? "Perfil publicado"
              : pendientes > 0
                ? `Sin publicar · ${pendientes} ${pendientes === 1 ? "documento por revisar" : "documentos por revisar"}`
                : "Sin publicar"}
          </span>
        </div>
      </Encabezado>

      <div className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        {/* Documentos primero en celular (es lo que se revisa); a la derecha en escritorio. */}
        <section
          aria-labelledby="documentos-titulo"
          className="order-first flex flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1"
        >
          <h2 id="documentos-titulo" className="font-titulo text-[26px] leading-tight">
            Documentos
          </h2>
          {detalle.documentos.map((documento) => (
            <DocumentoRevision key={documento.id} documento={documento} />
          ))}
        </section>

        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <Tarjeta className="flex flex-col gap-3">
            <h2 className="font-titulo text-[22px] leading-tight">Datos del perfil</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[15px]">
              <dt className="font-bold">Nombre</dt>
              <dd>{nombre}</dd>
              <dt className="font-bold">WhatsApp</dt>
              <dd className="break-all">{detalle.whatsapp ?? "Sin cargar"}</dd>
              <dt className="font-bold">Email</dt>
              <dd className="break-all">{detalle.email ?? "No disponible"}</dd>
              <dt className="font-bold">Oficios</dt>
              <dd>{detalle.oficios.map(nombreOficio).join(", ") || "Sin cargar"}</dd>
              <dt className="font-bold">Matrícula declarada</dt>
              <dd>{detalle.matricula ?? "No declarada"}</dd>
              <dt className="font-bold">Normas aceptadas</dt>
              <dd>
                {detalle.normasAceptadasAt
                  ? `Versión ${detalle.normasVersion ?? "—"} · ${fecha(detalle.normasAceptadasAt)}`
                  : "Todavía no"}
              </dd>
            </dl>
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-3">
            <h2 className="font-titulo text-[22px] leading-tight">Checklist de revisión</h2>
            <p className="text-[15px]">Lo marcás mientras revisás. No se guarda.</p>
            <ul className="flex flex-col gap-2">
              {CHECKLIST.map((texto) => (
                <li key={texto}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base leading-snug">
                    <input type="checkbox" className="mt-1 size-[22px] shrink-0 accent-accion" />
                    <span>{texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <p className="text-[15px]">
            Los documentos no se muestran en ninguna pantalla pública: solo las insignias. Cada vez
            que abrís un archivo queda registrado.
          </p>
        </div>
      </div>
    </>
  );
}
