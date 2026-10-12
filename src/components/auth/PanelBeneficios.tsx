import { Check } from "lucide-react";

const BENEFICIOS = [
  "Profesionales con identidad y antecedentes verificados",
  "Contacto directo por WhatsApp",
  "Sin costo",
] as const;

/** Panel de escritorio del registro de cliente: tres beneficios (a la derecha del formulario). */
export function PanelBeneficios() {
  return (
    <aside
      aria-label="Beneficios de crear tu cuenta"
      className="hidden flex-col gap-5 rounded-[20px] bg-azul p-8 text-sobre-azul lg:flex"
    >
      <h2 className="font-titulo text-[28px] leading-tight">Contratá con tranquilidad</h2>
      <ul className="flex flex-col gap-3.5 text-[17px] leading-snug">
        {BENEFICIOS.map((beneficio) => (
          <li key={beneficio} className="flex items-start gap-3">
            <Check aria-hidden strokeWidth={2.5} className="mt-0.5 size-5 shrink-0" />
            {beneficio}
          </li>
        ))}
      </ul>
    </aside>
  );
}
