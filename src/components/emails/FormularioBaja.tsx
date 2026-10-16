import { BotonConfirmarBaja } from "@/components/emails/BotonConfirmarBaja";
import { confirmarBaja } from "@/lib/emails/acciones";
import type { CategoriaBaja } from "@/lib/emails/token";

/** Qué deja de recibir cada categoría, en el texto de la página de baja. */
export const TEXTO_CATEGORIA: Record<CategoriaBaja, string> = {
  trabajos_cerca: "el resumen diario de trabajos nuevos",
  novedades: "los recordatorios y novedades",
};

type Props = {
  /** Token firmado: viaja en un campo oculto y lo verifica el servidor al confirmar. */
  token: string;
  categoria: CategoriaBaja;
  conError: boolean;
};

/** Pide confirmar la baja (sin ingresar). Lo usan la ruta con `?t=` y la que lee el fragmento. */
export function FormularioBaja({ token, categoria, conError }: Props) {
  return (
    <form action={confirmarBaja} className="flex flex-col gap-4">
      <input type="hidden" name="t" value={token} />
      <p>
        Vas a dejar de recibir {TEXTO_CATEGORIA[categoria]}. Los avisos de tu cuenta y de tus
        trabajos en curso te siguen llegando.
      </p>
      {conError ? (
        <p role="alert" className="text-sm font-semibold text-error">
          No pudimos darte de baja. Probá de nuevo en unos minutos.
        </p>
      ) : null}
      <BotonConfirmarBaja />
    </form>
  );
}
