import { Star } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { CintaDistancia } from "@/components/ui/cinta-metrica";
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
 * Tarjeta de un profesional en los resultados (Resultados / Desk-Buscar del prototipo): avatar,
 * nombre con inicial del apellido, oficio · años · zonas, puntaje, cinta de distancia e insignias.
 * Toda la tarjeta es un link al perfil público. Sin datos de contacto: el WhatsApp se pide al
 * servidor desde el perfil (LAB-25).
 *
 * @example
 * <TarjetaProfesional profesional={resultado} />
 */
export function TarjetaProfesional({ profesional: p, className }: Props) {
  const nombre = nombreCorto(p.nombre, p.apellidoInicial);
  const linea = [descripcionOficios(p.oficios), textoAnios(p.aniosExperiencia), p.zonasTexto]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/profesionales/${p.usuarioId}`}
      className={cn(
        "flex flex-col gap-2.5 rounded-[18px] bg-superficie p-4 text-texto no-underline hover:bg-superficie-elevada lg:border lg:border-divisor lg:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          nombre={nombre}
          src={urlFoto(p.fotoPath)}
          className="size-[52px] bg-azul-suave text-lg font-extrabold text-sobre-azul-suave"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold">{nombre}</span>
          <span className="text-sm text-texto-secundario">{linea}</span>
        </div>
        {p.promedio === null ? (
          <span className="text-sm font-bold text-texto-secundario">Nuevo</span>
        ) : (
          <span className="flex items-center gap-1 text-sm font-bold">
            <Star
              aria-hidden
              strokeWidth={1.5}
              className="size-4 fill-naranja-marca text-naranja-marca"
            />
            <span className="sr-only">Calificación </span>
            {promedioAr.format(p.promedio)}
          </span>
        )}
      </div>
      <CintaDistancia km={p.distanciaKm} />
      <div className="flex flex-wrap gap-1.5">
        {p.identidadVerificada ? <Insignia variante="verificada" /> : null}
        {p.antecedentesOk ? <Insignia variante="antecedentes" /> : null}
        {p.matriculado ? <Insignia variante="matriculado" /> : null}
      </div>
    </Link>
  );
}
