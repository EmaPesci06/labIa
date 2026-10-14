import { BadgeCheck, UserRoundCog } from "lucide-react";

import { FilaEnlace } from "@/components/cuenta/FilaCuenta";

const ICONO = "size-5 shrink-0 text-azul";

/**
 * Filas de /cuenta solo para profesionales (LAB-43): su perfil público (/cuenta/perfil) y la
 * verificación de documentos (/cuenta/verificacion). Van dentro de un `GrupoCuenta`.
 */
export function FilasProfesional() {
  return (
    <>
      <FilaEnlace href="/cuenta/perfil" icono={<UserRoundCog aria-hidden className={ICONO} />}>
        Perfil profesional
      </FilaEnlace>
      <FilaEnlace href="/cuenta/verificacion" icono={<BadgeCheck aria-hidden className={ICONO} />}>
        Verificación
      </FilaEnlace>
    </>
  );
}
