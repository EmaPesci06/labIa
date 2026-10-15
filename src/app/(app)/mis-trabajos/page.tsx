import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MaestroDetalleMisTrabajos } from "@/components/mis-trabajos/MaestroDetalleMisTrabajos";
import type { TabMisTrabajos } from "@/components/mis-trabajos/PestanasMisTrabajos";
import { obtenerSesion } from "@/lib/sesion";
import {
  contarMisTrabajosCliente,
  obtenerDetalleMiTrabajoCliente,
  obtenerMisTrabajosCliente,
} from "@/lib/trabajos/consulta";

export const metadata: Metadata = {
  title: "Mis trabajos · LabÍA",
  description: "Consultá tus trabajos publicados, compará postulantes y elegí a un profesional.",
};

type Props = {
  searchParams: Promise<{ tab?: string; id?: string }>;
};

export default async function MisTrabajosPage({ searchParams }: Props) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/ingresar?volver=/mis-trabajos");
  }
  if (sesion.rol === "profesional") {
    redirect("/trabajos");
  }

  const { tab, id } = await searchParams;
  const tabActiva: TabMisTrabajos =
    tab === "contratados" || tab === "terminados" ? tab : "abiertos";

  const trabajos = await obtenerMisTrabajosCliente(sesion.usuario.id, tabActiva);

  // Abiertos vacía: el texto depende de si el cliente tiene trabajos en otras pestañas (LAB-51).
  // Solo se cuenta en ese caso, para no sumar una consulta en las demás vistas.
  let hayTrabajosEnOtrasPestanas = false;
  if (tabActiva === "abiertos" && trabajos.length === 0) {
    hayTrabajosEnOtrasPestanas = (await contarMisTrabajosCliente(sesion.usuario.id)) > 0;
  }

  // El detalle solo se consulta si la URL trae un trabajo elegido (?id=). Sin id no se carga:
  // en celular no se muestra, y en escritorio el cliente agrega el primero (SeleccionInicialEscritorio).
  let trabajoSeleccionado = null;
  if (id) {
    trabajoSeleccionado = await obtenerDetalleMiTrabajoCliente(id, sesion.usuario.id);
  }

  return (
    <MaestroDetalleMisTrabajos
      trabajos={trabajos}
      trabajoSeleccionado={trabajoSeleccionado}
      tabActiva={tabActiva}
      hayTrabajosEnOtrasPestanas={hayTrabajosEnOtrasPestanas}
    />
  );
}
