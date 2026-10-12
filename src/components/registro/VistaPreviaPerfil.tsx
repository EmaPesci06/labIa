import { Avatar } from "@/components/ui/Avatar";

type Props = {
  nombre: string;
  /** Oficios en texto ("Gas, Plomería"). */
  oficios: string;
  /** Zonas en texto ("Toda la ciudad" o "Centro, La Perla"). */
  zonas: string;
  /** URL de la foto de perfil, si hay. */
  foto: string | null;
};

/**
 * Cómo ve un cliente el perfil, mientras se arma (solo escritorio). Las insignias van en gris
 * porque todavía no hay nada verificado: las concede un admin.
 */
export function VistaPreviaPerfil({ nombre, oficios, zonas, foto }: Props) {
  const nombreVisible = nombre.trim() || "Tu nombre";
  return (
    <section aria-labelledby="vista-previa-titulo" className="flex flex-col gap-4">
      <h2
        id="vista-previa-titulo"
        className="font-mono text-[13px] font-semibold tracking-[0.6px] text-texto-terciario uppercase"
      >
        Así te ven los clientes
      </h2>
      <div className="flex flex-col gap-3 rounded-[20px] border border-divisor bg-superficie p-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={nombreVisible} src={foto} className="size-14 text-xl" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-lg font-bold">{nombreVisible}</span>
            <span className="text-sm text-texto-secundario">
              {oficios || "Elegí al menos un oficio"}
            </span>
          </div>
        </div>
        <p className="text-sm text-texto-secundario">Zonas: {zonas || "Elegí tus zonas"}</p>
        <ul aria-label="Insignias pendientes" className="flex flex-wrap gap-1.5">
          {["Identidad verificada", "Sin antecedentes"].map((texto) => (
            <li
              key={texto}
              className="rounded-full bg-divisor px-2.5 py-1 text-xs font-bold text-texto-secundario"
            >
              {texto} · pendiente
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
