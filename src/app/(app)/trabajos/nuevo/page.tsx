import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioTrabajo, type BarrioOpcion } from "@/components/trabajos/FormularioTrabajo";
import { Encabezado } from "@/components/ui/Encabezado";
import { OFICIOS, type Oficio } from "@/lib/busqueda";
import { rolFalso } from "@/lib/auth/sesion-falsa";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Publicar un trabajo · Oficio Seguro" };

// Barrios frecuentes como chips (por slug); el resto va en "Otro barrio".
const SLUGS_FRECUENTES = ["la-perla", "centro", "chauvin", "los-troncos"];

// Solo para la sesión falsa de desarrollo/e2e, que no tiene base de datos.
const BARRIOS_DEMO: (BarrioOpcion & { slug: string })[] = [
  { id: 17, nombre: "Centro", slug: "centro" },
  { id: 20, nombre: "Chauvín", slug: "chauvin" },
  { id: 51, nombre: "La Perla", slug: "la-perla" },
  { id: 67, nombre: "Los Troncos", slug: "los-troncos" },
  { id: 78, nombre: "Playa Grande", slug: "playa-grande" },
  { id: 84, nombre: "Punta Mogotes", slug: "punta-mogotes" },
];

type Props = { searchParams: Promise<{ oficio?: string | string[] }> };

export default async function PublicarTrabajo({ searchParams }: Props) {
  const sesion = await obtenerSesion();
  // El proxy ya restringe la ruta a clientes; esto es la segunda barrera.
  if (!sesion || sesion.rol !== "cliente") redirect("/trabajos");

  const { oficio: oficioUrl } = await searchParams;
  const candidato = Array.isArray(oficioUrl) ? oficioUrl[0] : oficioUrl;
  const oficioInicial = (OFICIOS as readonly string[]).includes(candidato ?? "")
    ? (candidato as Oficio)
    : null;

  let barrios: (BarrioOpcion & { slug: string })[] = BARRIOS_DEMO;
  let barrioInicial: number | null = null;
  if (!rolFalso() && supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const [{ data: filas }, { data: usuario }] = await Promise.all([
      supabase.from("barrios").select("id, nombre, slug").order("nombre"),
      supabase.from("usuarios").select("barrio_id").eq("id", sesion.usuario.id).maybeSingle(),
    ]);
    barrios = filas ?? [];
    barrioInicial = usuario?.barrio_id ?? null;
  } else {
    barrioInicial = 51;
  }

  const frecuentes = SLUGS_FRECUENTES.flatMap((slug) => {
    const b = barrios.find((x) => x.slug === slug);
    return b ? [{ id: b.id, nombre: b.nombre }] : [];
  });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[18px]">
      <Encabezado
        variante="plano"
        titulo="Contanos qué pasó"
        descripcion="Lo ven los profesionales verificados de tu zona y te escriben ellos."
        volver={{ href: "/inicio" }}
      />
      <FormularioTrabajo
        barrios={barrios.map(({ id, nombre }) => ({ id, nombre }))}
        frecuentes={frecuentes}
        barrioInicial={barrioInicial}
        oficioInicial={oficioInicial}
        sinAlmacenamiento={Boolean(rolFalso())}
      />
    </div>
  );
}
