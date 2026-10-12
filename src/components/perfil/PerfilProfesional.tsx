import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { CintaDistancia } from "@/components/ui/cinta-metrica";
import { Insignia } from "@/components/ui/Insignia";
import { cn } from "@/lib/cn";
import type { PaginaResenas, PerfilPublico } from "@/lib/perfil/cargar";
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
};

function Insignias({ perfil, className }: { perfil: PerfilPublico; className?: string }) {
  if (!perfil.identidadVerificada && !perfil.antecedentesOk && !perfil.matriculado) return null;
  return (
    <ul aria-label="Verificaciones" className={cn("flex flex-wrap gap-1.5", className)}>
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

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-[15px]">
      <dt className="text-texto-secundario">{etiqueta}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function DatosPerfil({ perfil, className }: { perfil: PerfilPublico; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-2 lg:gap-3.5", className)}>
      <Fila etiqueta="Oficios">{textoOficios(perfil.oficios)}</Fila>
      {perfil.especialidades ? (
        <div className="lg:hidden">
          <Fila etiqueta="Especialidades">{perfil.especialidades}</Fila>
        </div>
      ) : null}
      {perfil.zonasTexto ? <Fila etiqueta="Zonas">{perfil.zonasTexto}</Fila> : null}
      {perfil.disponibilidad ? (
        <Fila etiqueta="Disponibilidad">{perfil.disponibilidad}</Fila>
      ) : null}
    </dl>
  );
}

function Puntaje({ perfil }: { perfil: PerfilPublico }) {
  if (perfil.cantidadResenas === 0 || perfil.promedio === null) {
    return <span className="text-sm text-texto-secundario">Todavía sin reseñas</span>;
  }
  return (
    <span className="flex items-center gap-1 text-sm font-bold lg:text-[15px]">
      <Star
        aria-hidden
        strokeWidth={1.5}
        className="size-4 fill-naranja-marca text-naranja-marca lg:size-[18px]"
      />
      {formatearPromedio(perfil.promedio)}
      <span className="font-normal text-texto-secundario">
        <span className="lg:hidden">· {textoCantidadResenas(perfil.cantidadResenas)}</span>
        <span className="hidden lg:inline">({textoCantidadResenas(perfil.cantidadResenas)})</span>
      </span>
    </span>
  );
}

function BannerDuenio({ publicado }: { publicado: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[14px] p-3.5 text-[15px] font-semibold leading-snug",
        publicado
          ? "bg-exito-suave text-sobre-exito-suave"
          : "bg-naranja-suave text-sobre-naranja-suave",
      )}
    >
      {publicado
        ? "Tu perfil está publicado."
        : "Tu perfil está en revisión: todavía no aparece en búsquedas."}
    </div>
  );
}

/**
 * Perfil público del profesional (prototipo "Perfil" y "Desk-Perfil"). Celular: una columna con
 * el botón de WhatsApp fijo sobre la barra inferior. Escritorio: dos columnas, con una tarjeta
 * fija a la derecha (insignias, distancia, datos y botón). Si lo mira el dueño, muestra el banner
 * de estado y "Editar perfil" en lugar del contacto.
 *
 * Nunca recibe ni muestra WhatsApp, email, DNI ni documentos: no están en `PerfilPublico`.
 */
export function PerfilProfesional({ perfil, resenas, distanciaKm }: Props) {
  const { esPropio } = perfil;
  const profesion = profesionPrincipal(perfil.oficios);
  const especialidades = separarEspecialidades(perfil.especialidades);
  const hrefVolver = "/buscar";

  return (
    <article className={cn("flex flex-col gap-5 lg:gap-6", !esPropio && "pb-36 lg:pb-0")}>
      {esPropio ? <BannerDuenio publicado={perfil.publicado} /> : null}

      <EnlaceVolver
        href={hrefVolver}
        etiquetaEscritorio={`Volver a ${profesion.toLowerCase()}s`}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-[999_1_560px] lg:gap-7">
          <header className="flex flex-col gap-5">
            <div className="flex items-center gap-4 lg:gap-[22px]">
              <Avatar
                nombre={perfil.nombre}
                src={perfil.fotoUrl}
                tamano={84}
                className="lg:size-28 lg:text-[40px]"
              />
              <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
                <h1 className="font-titulo text-[26px] leading-tight lg:text-[40px] lg:tracking-[-1px]">
                  {perfil.nombre}
                </h1>
                <p className="text-[15px] text-texto-secundario lg:text-[17px]">
                  {lineaOficio(perfil.oficios, perfil.aniosExperiencia)}
                  {perfil.zonasTexto ? (
                    <span className="hidden lg:inline"> · {perfil.zonasTexto}</span>
                  ) : null}
                </p>
                {distanciaKm !== null ? (
                  <CintaDistancia km={distanciaKm} sufijo="de vos" className="lg:hidden" />
                ) : null}
                <Puntaje perfil={perfil} />
              </div>
            </div>
            <Insignias perfil={perfil} className="lg:hidden" />
          </header>

          {perfil.descripcion ? (
            <section className="flex flex-col gap-2.5">
              <h2 className="hidden text-xl font-bold lg:block">Sobre mí</h2>
              <p className="text-base leading-normal whitespace-pre-line lg:text-[17px] lg:leading-[1.55]">
                {perfil.descripcion}
              </p>
              {especialidades.length > 0 ? (
                <ul className="hidden flex-wrap gap-2 lg:flex">
                  {especialidades.map((e) => (
                    <li
                      key={e}
                      className="rounded-full border border-borde bg-superficie px-3.5 py-2 text-sm font-semibold"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : esPropio ? (
            <p className="rounded-[14px] bg-superficie p-3.5 text-[15px] text-texto-secundario">
              Contá cómo trabajás: sumá una descripción en{" "}
              <Link href="/cuenta/perfil" className="font-bold text-azul underline">
                Editar perfil
              </Link>
              .
            </p>
          ) : null}

          <section
            aria-label="Datos del profesional"
            className="rounded-2xl bg-superficie p-4 lg:hidden"
          >
            <DatosPerfil perfil={perfil} />
          </section>

          {perfil.fotosTrabajos.length > 0 ? (
            <section className="flex flex-col gap-2.5 lg:gap-3">
              <h2 className="text-[17px] font-bold lg:text-xl">Trabajos hechos</h2>
              <GaleriaTrabajos fotos={perfil.fotosTrabajos} nombre={perfil.nombre} />
            </section>
          ) : null}

          <section className="flex flex-col gap-2.5 lg:gap-3">
            <h2 className="text-[17px] font-bold lg:text-xl">Reseñas</h2>
            <ListaResenas
              profesionalId={perfil.id}
              iniciales={resenas.resenas}
              total={resenas.total}
            />
          </section>

          <Aviso className="lg:hidden">Se comprometió con las normas de seguridad de LabÍA.</Aviso>
          {esPropio ? null : (
            <Link
              href="#"
              className="flex min-h-11 items-center justify-center text-sm text-texto-terciario underline lg:hidden"
            >
              Reportar perfil
            </Link>
          )}
        </div>

        <aside className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex lg:flex-1 lg:basis-80">
          <div className="flex flex-col gap-3.5 rounded-[20px] border border-divisor bg-superficie p-[22px]">
            <Insignias perfil={perfil} />
            {distanciaKm !== null ? <CintaDistancia km={distanciaKm} sufijo="de vos" /> : null}
            <DatosPerfil perfil={perfil} />
            {esPropio ? (
              <Boton href="/cuenta/perfil" variante="cliente" tamano="grande" bloque>
                Editar perfil
              </Boton>
            ) : (
              <>
                <BotonContactar />
                <Link
                  href="#"
                  className="flex min-h-11 items-center justify-center text-sm text-texto-terciario underline"
                >
                  Reportar perfil
                </Link>
              </>
            )}
          </div>
          <Aviso className="items-start rounded-2xl p-[18px] text-[15px]">
            Se comprometió con las normas de seguridad de LabÍA.
          </Aviso>
        </aside>
      </div>

      {esPropio ? (
        <Boton href="/cuenta/perfil" variante="cliente" tamano="grande" bloque className="lg:hidden">
          Editar perfil
        </Boton>
      ) : (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-divisor bg-fondo px-5 py-3 lg:hidden">
          <BotonContactar />
        </div>
      )}
    </article>
  );
}
