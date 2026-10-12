# (app)

Pantallas con sesión iniciada: inicio, buscar, profesionales/[id], trabajos, mis-trabajos y cuenta.
El paréntesis es un grupo de rutas de Next: no aparece en la URL (`/inicio`, `/buscar`…).

## Estructura (LAB-13)

- `layout.tsx` arma el armazón: barra superior en escritorio (`lg`), barra inferior en celular y un `<main id="contenido">` de 1200 px máx. **Las páginas no llevan su propio `<main>`.**
- El rol sale de `obtenerSesion()` (`src/lib/sesion.ts`), hoy falsa: `LABIA_ROL_DEV=profesional` en `.env.local` para ver la navegación del profesional. LAB-16 la reemplaza.
- Los destinos de cada rol están en `src/lib/navegacion.ts`.
- Varias páginas son marcadores (`PantallaPendiente`) para que la navegación no lleve a un 404; cada tarea de pantalla pisa la suya.
