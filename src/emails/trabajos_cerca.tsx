import { Link, Text } from "@react-email/components";

import {
  BotonAccion,
  COLOR_AZUL,
  estilosTexto,
  Layout,
  PIE_DE_PRUEBA,
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
    <Layout previa="Pedidos nuevos de tus oficios y tus zonas." pie={pie}>
      <Text style={estilosTexto.titulo}>{asuntoTrabajosCerca(trabajos.length)}</Text>
      <Text style={estilosTexto.parrafo}>
        Buen día, {nombre}. Esto se publicó en las últimas 24 horas en tus oficios y zonas.
      </Text>
      {trabajos.map((t, i) => (
        <Text key={i} style={{ ...estilosTexto.tarjeta, ...estilosTexto.parrafo }}>
          <Link href={t.url} style={{ color: COLOR_AZUL, fontWeight: 700 }}>
            {t.titulo}
          </Link>
          <br />
          {t.oficio} · {t.barrio} · {t.urgencia}
        </Text>
      ))}
      <BotonAccion href={urlTrabajos}>Ver todos los trabajos</BotonAccion>
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
