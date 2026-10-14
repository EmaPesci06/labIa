import type { Metadata } from "next";

import { ListaNormas, QueHaceLabia } from "@/components/normas/ListaNormas";

export const metadata: Metadata = { title: "Normas de seguridad · LabÍA" };

/** Normas de seguridad, de solo lectura y sin sesión (LAB-20). */
export default function Normas() {
  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-titulo text-[30px] leading-tight">Normas de seguridad</h1>
        <p className="text-[15px] leading-snug text-texto-secundario">
          Los clientes te abren la puerta de su casa. Para que confíen en vos, te comprometés a:
        </p>
      </div>
      <ListaNormas />
      <QueHaceLabia />
    </div>
  );
}
