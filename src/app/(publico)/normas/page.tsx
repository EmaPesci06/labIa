import type { Metadata } from "next";

import { ListaNormas, QueHaceLabia } from "@/components/normas/ListaNormas";
import { Encabezado } from "@/components/ui/Encabezado";

export const metadata: Metadata = { title: "Normas de seguridad · LabÍA" };

/** Normas de seguridad, de solo lectura y sin sesión (LAB-20, LAB-80: boceto `App-Normas`). */
export default function Normas() {
  return (
    <div className="flex flex-col gap-3.5 pt-2 lg:relative lg:left-1/2 lg:w-[min(720px,calc(100vw-80px))] lg:-translate-x-1/2 lg:gap-5">
      <Encabezado
        titulo="Normas de seguridad"
        descripcion="A lo que se compromete cada profesional antes de aparecer en LabÍA."
      />
      <ListaNormas />
      <QueHaceLabia />
    </div>
  );
}
