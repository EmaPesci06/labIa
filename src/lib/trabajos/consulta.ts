// Punto de entrada de las consultas de trabajos (LAB-46): reexporta los módulos de profesional y de
// cliente para que los imports existentes sigan igual.
export type { EstadoPostulacion } from "./consulta-comun";
export * from "./consulta-profesional";
export * from "./consulta-cliente";
export { formatearBajadaTrabajos } from "./formato";
