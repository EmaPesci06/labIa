import Image from "next/image";

import { Avatar as AvatarShadcn } from "@/components/shadcn/avatar";
import { cn } from "@/lib/cn";

type Props = {
  /** Nombre completo; se usa para las iniciales y como texto alternativo. */
  nombre: string;
  /** URL de la foto. Sin foto se muestran las iniciales sobre turquesa. */
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

/**
 * Avatar redondo: capa fina sobre el `Avatar` de shadcn, con foto (`next/image`) o iniciales sobre
 * turquesa, con borde sol. La foto no usa `AvatarImage` (que dibuja un `<img>` recién cuando carga):
 * así sigue saliendo en el HTML del servidor y optimizada por `next/image`.
 */
export function Avatar({ nombre, src, tamano = 44, className }: Props) {
  const base = cn(
    "items-center justify-center overflow-hidden border-[3px] border-secondary bg-primary text-primary-foreground after:hidden",
    tamano === 84 ? "size-[84px] font-titulo text-[30px]" : "size-11 text-base font-bold",
    className,
  );

  if (src) {
    return (
      <AvatarShadcn className={base}>
        <Image
          src={src}
          alt={nombre}
          width={tamano}
          height={tamano}
          className="size-full object-cover"
        />
      </AvatarShadcn>
    );
  }
  return (
    <AvatarShadcn role="img" aria-label={nombre} className={base}>
      <span aria-hidden>{iniciales(nombre)}</span>
    </AvatarShadcn>
  );
}
