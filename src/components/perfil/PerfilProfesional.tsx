import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Distancia } from "@/components/ui/Distancia";
import { Insignia } from "@/components/ui/Insignia";
import { BotonDejarResena } from "@/components/resenas/BotonDejarResena";
import { BotonReportar } from "@/components/reportes/BotonReportar";
import { cn } from "@/lib/cn";
import type { PaginaResenas, PerfilPublico } from "@/lib/perfil/cargar";
import type { ResenaPropia } from "@/lib/resenas/acciones";
import {
  formatearPromedio,
  lineaOficio,
  profesionPrincipal,
  separarEspecialidades,
  textoCantidadResenas,
  textoOficios,
} from "@/lib/perfil/datos";

import { BotonContactar } from "./BotonContactar";
import { EnlaceVolver } from "./EnlaceVolver";
import { GaleriaTrabajos } from "./GaleriaTrabajos";
import { ListaResenas } from "./ListaResenas";

type Props = {
  perfil: PerfilPublico;
  resenas: PaginaResenas;
  /** Distancia a la persona que mira (solo con sesión de cliente); `null` si no corresponde. */
  distanciaKm: number | null;
  /** Visitante sin sesión: el botón de contacto lleva a `/ingresar?volver=…`. */
  hrefIngreso?: string;
  /** Cliente con sesión: el botón abre la hoja de contacto (LAB-25). */
  puedeContactar?: boolean;
  /** Si el cliente actual puede reseñar al profesional (LAB-31). */
  puedeResenar?: boolean;
  /** Reseña previa del cliente si ya escribió una (LAB-31). */
  resenaPropia?: ResenaPropia | null;
};

const CLASE_REPORTAR =
  "inline-flex min-h-11 items-center justify-center self-center text-sm font-bold text-texto underline underline-offset-4";

function Insignias({ perfil, className }: { perfil: PerfilPublico; className?: string }) {
  if (!perfil.identidadVerificada && !perfil.antecedentesOk && !perfil.matriculado) return null;
  return (
    <ul aria-label="Verificaciones" className={cn("flex flex-wrap gap-2", className)}>
      {perfil.identidadVerificada ? (
        <li>
          <Insignia variante="verificada" tamano="grande" />
        </li>
      ) : null}
      {perfil.antecedentesOk ? (
        <li>
          <Insignia variante="antecedentes" tamano="grande" />
        </li>
      ) : null}
      {perfil.matriculado ? (
        <li>
          <Insignia variante="matriculado" tamano="grande" />
        </li>
      ) : null}
    </ul>
  );
}

function Fila({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4 text-[15px]", className)}>
      <dt className="text-texto">{etiqueta}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function DatosPerfil({ perfil, className }: { perfil: PerfilPublico; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-2 lg:gap-3.5", className)}>
      <Fila etiqueta="Oficios">{textoOficios(perfil.oficios)}</Fila>
      {perfil.especialidades ? (
        <Fila etiqueta="Especialidades" className="lg:hidden">
          {perfil.especialidades}
        </Fila>
      ) : null}
      {perfil.zonasTexto ? <Fila etiqueta="Zonas">{perfil.zonasTexto}</Fila> : null}
      {perfil.disponibilidad ? (
        <Fila etiqueta="Disponibilidad">{perfil.disponibilidad}</Fila>
      ) : null}
    </dl>
  );
}

function BannerDuenio({ publicado }: { publicado: boolean }) {
  return (
    <div
      role="status"
      className="rounded-[14px] bg-sol p-3.5 text-[15px] leading-snug font-semibold text-sobre-sol"
    >
      {publicado
        ? "Tu perfil está publicado."
        : "Tu perfil está en revisión: todavía no aparece en búsquedas."}
    </div>
  );
}

/**
 * Perfil público del profesional (prototipos "App-Perfil" y "Esc-Perfil"). Celular: encabezado
 * turquesa con la foto y las insignias, y una barra fija abajo con "Escribirle por WhatsApp" y
 * "Reportar este perfil". Escritorio: dos columnas, con una tarjeta fija a la derecha para hablar
 * con la persona. Si lo mira el dueño, muestra el banner de estado y "Editar perfil" en lugar del
 * contacto.
 *
 * Nunca recibe ni muestra WhatsApp, email, DNI ni documentos: no están en `PerfilPublico`.
 */
export function PerfilProfesional({
  perfil,
  resenas,
  distanciaKm,
  hrefIngreso,
  puedeContactar = false,
  puedeResenar = false,
  resenaPropia = null,
}: Props) {
  const { esPropio } = perfil;
  // Los profesionales no contactan a otros: sin sesión de cliente no hay botón de contacto.
  const hayContacto = !esPropio && (Boolean(hrefIngreso) || puedeContactar);
  const idContacto = puedeContactar ? perfil.id : undefined;
  const profesion = profesionPrincipal(perfil.oficios);
  const especialidades = separarEspecialidades(perfil.especialidades);
  const primerNombre = perfil.nombre.split(" ")[0] ?? perfil.nombre;
  const textosContacto = {
    etiqueta: "Escribirle por WhatsApp",
    tituloHoja: `Escribile a ${primerNombre} por WhatsApp`,
    textoCancelar: "Ahora no",
  };
  const reportar = (className: string) => (
    <BotonReportar
      objetivoTipo="perfil"
      objetivoId={perfil.id}
      tituloObjetivo={perfil.nombre}
      texto="Reportar este perfil"
      estaAutenticado={!hrefIngreso}
      hrefIngreso={hrefIngreso}
      className={className}
    />
  );

  return (
    <article className={cn("flex flex-col gap-6 lg:gap-8", !esPropio && "pb-52 lg:pb-0")}>
      {esPropio ? <BannerDuenio publicado={perfil.publicado} /> : null}

      <header className="flex flex-col gap-5 rounded-b-[28px] bg-encabezado px-5 pt-3 pb-6 text-sobre-encabezado lg:rounded-b-[40px] lg:px-8 lg:pt-6 lg:pb-9">
        <EnlaceVolver
          href="/buscar"
          etiquetaEscritorio={`Volver a ${profesion.toLowerCase()}s`}
          mostrarEtiquetaMovil
          className="self-start text-sobre-encabezado lg:text-sobre-encabezado"
        />
        <div className="flex items-center gap-4 lg:gap-8">
          <Avatar
            nombre={perfil.nombre}
            src={perfil.fotoUrl}
            tamano={84}
            className="size-24 border-[5px] bg-texto text-[40px] text-sobre-accion lg:size-[136px] lg:border-[6px] lg:text-[56px]"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-titulo text-[38px] leading-none lg:text-[64px] lg:leading-[0.95]">
              {perfil.nombre}
            </h1>
            <p className="text-[17px] lg:text-xl">
              {lineaOficio(perfil.oficios, perfil.aniosExperiencia)}
              {perfil.zonasTexto ? (
                <span className="hidden lg:inline"> · {perfil.zonasTexto}</span>
              ) : null}
            </p>
            {distanciaKm !== null ? (
              <Distancia km={distanciaKm} sufijo="de vos" className="self-start" />
            ) : null}
          </div>
        </div>
        <Insignias perfil={perfil} />
      </header>

      <div className="flex flex-col gap-6 px-5 lg:flex-row lg:items-start lg:gap-8 lg:px-8">
        <div className="flex min-w-0 flex-col gap-7 lg:flex-[999_1_560px]">
          <section aria-labelledby="que-arregla" className="flex flex-col gap-2.5">
            <h2 id="que-arregla" className="font-titulo text-[22px] leading-tight lg:text-[28px]">
              Qué arregla
            </h2>
            {perfil.descripcion ? (
              <p className="text-base leading-normal whitespace-pre-line lg:text-[17px] lg:leading-[1.55]">
                {perfil.descripcion}
              </p>
            ) : esPropio ? (
              <p className="rounded-[14px] bg-superficie p-3.5 text-[15px] text-texto">
                Contá cómo trabajás: sumá una descripción en{" "}
                <Link href="/cuenta/perfil" className="font-bold text-texto underline">
                  Editar perfil
                </Link>
                .
              </p>
            ) : null}
            {especialidades.length > 0 ? (
              <ul className="hidden flex-wrap gap-2 lg:flex">
                {especialidades.map((e) => (
                  <li
                    key={e}
                    className="rounded-full border border-texto bg-superficie px-3.5 py-2 text-sm font-semibold"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            ) : null}
            <DatosPerfil perfil={perfil} className="rounded-[18px] bg-superficie p-4 lg:p-5" />
          </section>

          {perfil.fotosTrabajos.length > 0 ? (
            <section aria-labelledby="trabajos-hechos" className="flex flex-col gap-2.5">
              <h2
                id="trabajos-hechos"
                className="font-titulo text-[22px] leading-tight lg:text-[28px]"
              >
                Trabajos que hizo
              </h2>
              <GaleriaTrabajos fotos={perfil.fotosTrabajos} nombre={perfil.nombre} />
            </section>
          ) : null}

          <section id="resena" aria-labelledby="resenas-titulo" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="resenas-titulo"
                className="font-titulo text-[22px] leading-tight lg:text-[28px]"
              >
                {perfil.promedio !== null && perfil.cantidadResenas > 0
                  ? `${formatearPromedio(perfil.promedio)} de 5 en ${textoCantidadResenas(perfil.cantidadResenas)}`
                  : "Reseñas"}
              </h2>
              {puedeResenar ? (
                <BotonDejarResena
                  profesionalId={perfil.id}
                  nombreProfesional={perfil.nombre}
                  resenaPropia={resenaPropia ?? null}
                />
              ) : null}
            </div>
            <ListaResenas
              profesionalId={perfil.id}
              iniciales={resenas.resenas}
              total={resenas.total}
            />
          </section>

          <Aviso className="lg:hidden">
            Se comprometió con las normas de seguridad de Oficio Seguro.
          </Aviso>
        </div>

        <aside
          aria-label="Contacto"
          className="hidden lg:sticky lg:top-24 lg:flex lg:flex-1 lg:basis-80 lg:flex-col lg:gap-4"
        >
          <div className="flex flex-col gap-3.5 rounded-[28px] bg-superficie p-6">
            {esPropio ? (
              <Boton href="/cuenta/perfil" tamano="grande" bloque>
                Editar perfil
              </Boton>
            ) : (
              <>
                <h2 className="font-titulo text-[28px] leading-tight">Hablá con {primerNombre}</h2>
                <p className="text-base leading-normal">
                  Se abre WhatsApp con un mensaje ya escrito. El precio y el horario los arreglan
                  entre ustedes.
                </p>
                {hayContacto ? (
                  <BotonContactar
                    hrefIngreso={hrefIngreso}
                    profesionalId={idContacto}
                    {...textosContacto}
                  />
                ) : null}
                {reportar(CLASE_REPORTAR)}
              </>
            )}
          </div>
          <Aviso className="items-start rounded-2xl p-[18px] text-[15px]">
            Se comprometió con las normas de seguridad de Oficio Seguro.
          </Aviso>
        </aside>
      </div>

      {esPropio ? (
        <div className="px-5 lg:hidden">
          <Boton href="/cuenta/perfil" tamano="grande" bloque>
            Editar perfil
          </Boton>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-1 rounded-t-[28px] bg-superficie px-5 pt-3 pb-2 lg:hidden">
          {hayContacto ? (
            <BotonContactar
              hrefIngreso={hrefIngreso}
              profesionalId={idContacto}
              {...textosContacto}
            />
          ) : null}
          {reportar(CLASE_REPORTAR)}
        </div>
      )}
    </article>
  );
}
