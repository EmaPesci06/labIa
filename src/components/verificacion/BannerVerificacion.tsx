import Link from "next/link";

import type { ResumenBanner } from "@/lib/verificacion/logica";

/**
 * Aviso para el profesional mientras revisamos sus documentos (LAB-21): azul suave si está en
 * revisión; naranja suave con el motivo y un enlace para volver a subir si fue rechazado.
 */
export function BannerVerificacion({ resumen }: { resumen: ResumenBanner | null }) {
  if (!resumen) return null;

  if (resumen.tipo === "en_revision") {
    return (
      <div
        role="status"
        className="rounded-[14px] bg-azul-suave p-3.5 text-sm leading-snug text-sobre-azul-suave"
      >
        Estamos revisando tu DNI y tus antecedentes. Ya podés ver trabajos.
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-[14px] bg-naranja-suave p-3.5 text-sm leading-snug text-sobre-naranja-suave sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Revisá tus documentos: {resumen.documento} · {resumen.motivo}
      </p>
      <Link href="/cuenta/verificacion" className="font-bold underline underline-offset-2">
        Subir de nuevo
      </Link>
    </div>
  );
}
