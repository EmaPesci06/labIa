import Image from "next/image";

import { cn } from "@/lib/cn";

type Props = {
  /** Nombre completo; se usa para las iniciales y como texto alternativo. */
  nombre: string;
  /** URL de la foto. Sin foto se muestran las iniciales sobre azul. */
  src?: string | null;
  /** Diámetro en px: 44 (listas, encabezado) o 84 (perfil). */
  tamano?: 44 | 84;
  className?: string;
};

/** "Martín Gómez" → "MG". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primera + ultima).toUpperCase();
}

/** Avatar redondo con foto (`next/image`) o iniciales sobre azul. */
export function Avatar({ nombre, src, tamano = 44, className }: Props) {
  const base = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-azul text-sobre-azul",
    tamano === 84 ? "size-[84px] font-titulo text-[30px]" : "size-11 text-base font-bold",
    className,
  );

  if (src) {
    return (
      <span className={base}>
        <Image
          src={src}
          alt={nombre}
          width={tamano}
          height={tamano}
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span role="img" aria-label={nombre} className={base}>
      <span aria-hidden>{iniciales(nombre)}</span>
    </span>
  );
}
