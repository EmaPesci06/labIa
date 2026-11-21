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
  title: "Mis trabajos · Oficio Seguro",
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

  // La lista y el detalle (solo si la URL trae ?id=) no dependen entre sí: juntas (LAB-88).
  // En celular el detalle no se muestra, y en escritorio el cliente agrega el primero
  // (SeleccionInicialEscritorio), así que sin id no se carga.
  const [trabajos, trabajoSeleccionado] = await Promise.all([
    obtenerMisTrabajosCliente(sesion.usuario.id, tabActiva),
    id ? obtenerDetalleMiTrabajoCliente(id, sesion.usuario.id) : null,
  ]);

  // Abiertos vacía: el texto depende de si el cliente tiene trabajos en otras pestañas (LAB-51).
  // Solo se cuenta en ese caso, para no sumar una consulta en las demás vistas.
  let hayTrabajosEnOtrasPestanas = false;
  if (tabActiva === "abiertos" && trabajos.length === 0) {
    hayTrabajosEnOtrasPestanas = (await contarMisTrabajosCliente(sesion.usuario.id)) > 0;
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
