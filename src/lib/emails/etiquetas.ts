export const ETIQUETA_OFICIO: Record<string, string> = {
  carpinteria: "Carpintería",
  plomeria: "Plomería",
  cerrajeria: "Cerrajería",
  gas: "Gas",
  pintura: "Pintura",
  mecanica: "Mecánica",
  electricidad: "Electricidad",
};

export const ETIQUETA_URGENCIA: Record<string, string> = {
  lo_antes_posible: "Lo antes posible",
  esta_semana: "Esta semana",
  sin_apuro: "Sin apuro",
};

export const ETIQUETA_DOCUMENTO: Record<string, string> = {
  dni_frente: "DNI (frente)",
  dni_dorso: "DNI (dorso)",
  antecedentes: "Certificado de antecedentes",
  matricula: "Matrícula",
};

export const etiquetaOficio = (oficio: string): string => ETIQUETA_OFICIO[oficio] ?? oficio;
export const etiquetaUrgencia = (urgencia: string): string =>
  ETIQUETA_URGENCIA[urgencia] ?? urgencia;
export const etiquetaDocumento = (tipo: string): string => ETIQUETA_DOCUMENTO[tipo] ?? tipo;
