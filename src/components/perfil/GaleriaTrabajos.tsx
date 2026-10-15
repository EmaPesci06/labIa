import { VisorFotos } from "@/components/ui/VisorFotos";

type Props = {
  /** URLs públicas de las fotos (bucket `fotos`). */
  fotos: readonly string[];
  /** Nombre del profesional, para el texto alternativo: "trabajos de Martín G.". */
  nombre: string;
};

/** "Trabajos hechos" del perfil público: grilla cuadrada de 3 columnas (celular) o 4 (escritorio). */
export function GaleriaTrabajos({ fotos, nombre }: Props) {
  return <VisorFotos fotos={fotos} contexto={`trabajos de ${nombre}`} miniaturas="cuadradas" />;
}
