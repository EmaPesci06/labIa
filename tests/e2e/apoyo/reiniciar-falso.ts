// LAB-32: reinicia el estado de moderación del Supabase FALSO antes de todas las pruebas. Corre una sola
// vez (globalSetup de playwright.config.ts), antes de que empiece cualquier proyecto, para que los
// proyectos que corren en paralelo no se borren los reportes unos a otros. Sin LABIA_E2E_SUPABASE_FALSO=1
// no hace nada.
export default async function reiniciarFalso() {
  if (process.env.LABIA_E2E_SUPABASE_FALSO !== "1") return;
  const puerto = process.env.LABIA_SUPABASE_FALSO_PUERTO ?? "54399";
  const respuesta = await fetch(`http://localhost:${puerto}/__moderacion/reiniciar`);
  if (!respuesta.ok) throw new Error(`No se pudo reiniciar el Supabase falso: ${respuesta.status}`);
}
