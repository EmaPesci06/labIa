import { Link } from "@react-email/components";

import {
  BotonAccion,
  Layout,
  Parrafo,
  PIE_DE_PRUEBA,
  Tarjeta,
  TEXTO,
  type DatosPie,
} from "@/lib/emails/Layout";

export type TrabajoResumen = {
  titulo: string;
  oficio: string;
  /** Barrio (nunca una dirección). */
  barrio: string;
  urgencia: string;
  url: string;
};

export type DatosTrabajosCerca = {
  nombre: string;
  /** Máximo 5. */
  trabajos: TrabajoResumen[];
  urlTrabajos: string;
};

export function asuntoTrabajosCerca(cantidad: number): string {
  return cantidad === 1 ? "1 trabajo nuevo cerca tuyo" : `${cantidad} trabajos nuevos cerca tuyo`;
}

export default function TrabajosCerca({
  nombre,
  trabajos,
  urlTrabajos,
  pie,
}: DatosTrabajosCerca & { pie: DatosPie }) {
  return (
    <Layout
      previa="Pedidos nuevos de tus oficios y tus zonas."
      titulo={asuntoTrabajosCerca(trabajos.length)}
      subtitulo={`Buen día, ${nombre}. Se publicaron en las últimas 24 horas.`}
      motivo="Te escribimos porque pediste el resumen diario."
      pie={pie}
      conPreferencias
      conBaja
    >
      {trabajos.map((t, i) => (
        <Tarjeta
          key={i}
          etiqueta={`${t.oficio} · ${t.barrio} · ${t.urgencia}`}
          titulo={
            <Link href={t.url} style={{ color: TEXTO, textDecoration: "none" }}>
              {t.titulo}
            </Link>
          }
        />
      ))}
      <BotonAccion href={urlTrabajos}>Ver todos los trabajos</BotonAccion>
      <Parrafo>Llega una vez por día, solo si hay trabajos de tus oficios y tus zonas.</Parrafo>
    </Layout>
  );
}

TrabajosCerca.PreviewProps = {
  nombre: "Pablo",
  trabajos: [
    {
      titulo: "Pérdida en la canilla de la cocina",
      oficio: "Plomería",
      barrio: "Centro",
      urgencia: "Lo antes posible",
      url: "https://labia.example/trabajos/uno",
    },
    {
      titulo: "Cambiar cañería del baño",
      oficio: "Plomería",
      barrio: "Playa Grande",
      urgencia: "Esta semana",
      url: "https://labia.example/trabajos/dos",
    },
  ],
  urlTrabajos: "https://labia.example/trabajos",
  pie: PIE_DE_PRUEBA,
} satisfies DatosTrabajosCerca & { pie: DatosPie };
