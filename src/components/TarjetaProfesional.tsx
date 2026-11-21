import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Distancia } from "@/components/ui/Distancia";
import { Insignia } from "@/components/ui/Insignia";
import type { ResultadoProfesional } from "@/lib/busqueda";
import { cn } from "@/lib/cn";
import { urlFoto } from "@/lib/fotos";
import { descripcionOficios } from "@/lib/oficios";

const promedioAr = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "12 años", "1 año"; `null` si no se sabe. */
function textoAnios(anios: number | null): string | null {
  if (anios === null) return null;
  return `${anios} ${anios === 1 ? "año" : "años"}`;
}

/** "Martín G." aunque la base guarde la inicial con o sin punto. */
export function nombreCorto(nombre: string, apellidoInicial: string): string {
  const inicial = apellidoInicial.trim().replace(/\.$/, "");
  return inicial ? `${nombre} ${inicial}.` : nombre;
}

type Props = {
  profesional: ResultadoProfesional;
  className?: string;
};

/**
 * Tarjeta de un profesional en los resultados (boceto `App-Buscar` y `Esc-Buscar`): avatar con borde
 * destacado, nombre, calificación, oficio · años, distancia en pastilla destacado e insignias. Toda la tarjeta es
 * un link al perfil público. Sin datos de contacto: el WhatsApp se pide al servidor desde el perfil.
 *
 * @example
 * <TarjetaProfesional profesional={resultado} />
 */
export function TarjetaProfesional({ profesional: p, className }: Props) {
  const nombre = nombreCorto(p.nombre, p.apellidoInicial);
  const calificacion =
    p.promedio === null
      ? "Sin reseñas todavía"
      : `${promedioAr.format(p.promedio)} en ${p.cantidadResenas} ${p.cantidadResenas === 1 ? "reseña" : "reseñas"}`;
  const detalle = [descripcionOficios(p.oficios), textoAnios(p.aniosExperiencia)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/profesionales/${p.usuarioId}`}
      className={cn(
        "flex flex-col gap-2.5 rounded-[22px] bg-superficie p-3.5 text-texto no-underline hover:bg-superficie hover:text-texto lg:gap-3 lg:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3.5 lg:gap-[18px]">
        <Avatar
          nombre={nombre}
          src={urlFoto(p.fotoPath)}
          className="size-16 border-4 font-titulo text-[26px] lg:size-[76px] lg:text-[30px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-titulo text-[22px] leading-[1.1] font-extrabold lg:text-[26px]">
            {nombre}
          </span>
          <span className="text-[15px] font-bold">{calificacion}</span>
          {detalle ? <span className="text-[15px]">{detalle}</span> : null}
        </div>
        <Distancia km={p.distanciaKm} className="shrink-0" />
      </div>
      {p.identidadVerificada || p.antecedentesOk || p.matriculado ? (
        <div className="flex flex-wrap gap-1.5">
          {p.identidadVerificada ? <Insignia variante="verificada" /> : null}
          {p.antecedentesOk ? <Insignia variante="antecedentes" /> : null}
          {p.matriculado ? <Insignia variante="matriculado" /> : null}
        </div>
      ) : null}
    </Link>
  );
}
