// LAB-32 / LAB-50: reinicia el estado del Supabase FALSO. Sin LABIA_E2E_SUPABASE_FALSO=1 no hace nada.
// - Como globalSetup de playwright.config.ts (default export): corre una sola vez, antes de que empiece
//   cualquier proyecto, para que los proyectos en paralelo no se borren los reportes unos a otros.
// - Desde una prueba (export reiniciarFalso): vuelve reseñas, trabajos, postulaciones y reportes al estado
//   inicial, para las pruebas que cambian estado (mis-trabajos-cliente, mis-trabajos-pulido, etc.).
const PUERTO = process.env.LABIA_SUPABASE_FALSO_PUERTO ?? "54399";
const RUTAS_REINICIO = ["/__moderacion/reiniciar", "/__reiniciar"] as const;

export async function reiniciarFalso(): Promise<void> {
  if (process.env.LABIA_E2E_SUPABASE_FALSO !== "1") return;
  for (const ruta of RUTAS_REINICIO) {
    const respuesta = await fetch(`http://localhost:${PUERTO}${ruta}`);
    if (!respuesta.ok) {
      throw new Error(`No se pudo reiniciar el Supabase falso (${ruta}): ${respuesta.status}`);
    }
  }
}

export default reiniciarFalso;
