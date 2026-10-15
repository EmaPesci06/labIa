import { VisorFotos } from "@/components/ui/VisorFotos";

type Props = {
  fotos: readonly string[];
  tituloTrabajo?: string;
};

/** Fotos que adjuntó el cliente en el detalle del trabajo: grilla de 2 columnas, proporción 4/3. */
export function GaleriaFotosTrabajo({ fotos, tituloTrabajo = "Trabajo" }: Props) {
  return <VisorFotos fotos={fotos} contexto={tituloTrabajo} miniaturas="apaisadas" />;
}
